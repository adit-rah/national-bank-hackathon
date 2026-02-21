"""Counterfactual router – stateless: upload file, run simulation, return results."""

import asyncio
import os
from concurrent.futures import ProcessPoolExecutor
from fastapi import APIRouter, HTTPException, UploadFile, File, Query

from app.services.ingestion import parse_file
from app.services.counterfactual import simulate

router = APIRouter()

_cpu_workers = max(1, (os.cpu_count() or 2) - 1)
_process_pool = ProcessPoolExecutor(max_workers=_cpu_workers)


def _parse_and_simulate(contents: bytes, filename: str, remove_worst_pct: float) -> dict:
    """CPU-bound work: parse file + run counterfactual sim. Runs in a worker process."""
    df = parse_file(contents, filename)
    return simulate(df, remove_worst_pct=remove_worst_pct)


@router.post("/counterfactual")
async def run_counterfactual(
    file: UploadFile = File(...),
    remove_worst_pct: float = Query(0.1, ge=0.0, le=1.0),
):
    """Upload a CSV/Excel → get counterfactual simulation back. No persistence."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    loop = asyncio.get_running_loop()
    try:
        results = await loop.run_in_executor(
            _process_pool, _parse_and_simulate, contents, file.filename, remove_worst_pct
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return results