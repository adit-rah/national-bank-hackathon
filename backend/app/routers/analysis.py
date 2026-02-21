"""Analysis router – stateless: upload file, run analysis, return results.

Results are cached in-memory briefly so the frontend's two-step flow
(upload → fetch by session_id) keeps working without a database.
"""

import asyncio
import os
import uuid
from collections import OrderedDict
from concurrent.futures import ProcessPoolExecutor
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.services.ingestion import parse_file
from app.services.scoring import run_full_analysis

router = APIRouter()

_cpu_workers = max(1, (os.cpu_count() or 2) - 1)
_process_pool = ProcessPoolExecutor(max_workers=_cpu_workers)

# In-memory cache: session_id → results.  OrderedDict so we can evict oldest.
_MAX_CACHE = 50
_results_cache: OrderedDict[str, dict] = OrderedDict()


def _cache_put(session_id: str, data: dict):
    _results_cache[session_id] = data
    while len(_results_cache) > _MAX_CACHE:
        _results_cache.popitem(last=False)


def _parse_and_analyse(contents: bytes, filename: str) -> dict:
    """CPU-bound work: parse file + run full analysis. Runs in a worker process."""
    df = parse_file(contents, filename)
    results = run_full_analysis(df)
    results["trade_count"] = len(df)
    results["filename"] = filename
    return results


@router.post("/upload")
async def upload_and_analyse(file: UploadFile = File(...)):
    """Upload a CSV/Excel file → parse, analyse, return results with a session_id."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    loop = asyncio.get_running_loop()
    try:
        results = await loop.run_in_executor(
            _process_pool, _parse_and_analyse, contents, file.filename
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Generate a session_id so the frontend can call /api/analysis/{id}
    session_id = str(uuid.uuid4())
    response = {
        "session_id": session_id,
        "filename": results["filename"],
        "trade_count": results["trade_count"],
        "overtrading": results["overtrading"],
        "loss_aversion": results["loss_aversion"],
        "revenge_trading": results["revenge_trading"],
        "archetype": results["archetype"],
        "feature_summary": results["feature_summary"],
        "equity_curve": results["equity_curve"],
        "trade_frequency": results["trade_frequency"],
        "holding_time_comparison": results["holding_time_comparison"],
        "position_scatter": results["position_scatter"],
    }

    # Cache so GET/POST /analysis/{session_id} can return the same data
    _cache_put(session_id, response)

    return response


@router.post("/analysis/{session_id}")
async def get_analysis_post(session_id: str):
    """Return cached analysis results by session_id (POST variant)."""
    if session_id not in _results_cache:
        raise HTTPException(status_code=404, detail="Session not found or expired. Please re-upload.")
    return _results_cache[session_id]


@router.get("/analysis/{session_id}")
async def get_analysis(session_id: str):
    """Return cached analysis results by session_id (GET variant)."""
    if session_id not in _results_cache:
        raise HTTPException(status_code=404, detail="Session not found or expired. Please re-upload.")
    return _results_cache[session_id]


# Keep /analyse as an alias so both paths work
@router.post("/analyse")
async def analyse_trades(file: UploadFile = File(...)):
    """Alias for /upload — same stateless behaviour."""
    return await upload_and_analyse(file)


def _band(score: float) -> str:
    if score < 30:
        return "disciplined"
    elif score < 60:
        return "elevated"
    return "high_risk"