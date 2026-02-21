"""Upload router – CSV/XLSX file upload and manual trade entry."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.models import AnalysisSession
from app.schemas import TradeManualEntry, UploadResponse
from app.services.ingestion import ingest_dataframe, parse_file
import pandas as pd
import io

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a CSV or Excel file of trade data."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.lower().split(".")[-1]
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    contents = await file.read()
    try:
        df, validation_stats = parse_file(contents, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    session = await ingest_dataframe(db, df, filename=file.filename)
    await db.commit()

    message = f"Successfully uploaded {session.trade_count} trades"
    if validation_stats["total_removed"] > 0:
        message += f" ({validation_stats['total_removed']} invalid rows removed - {validation_stats['removal_percentage']}%)"

    return UploadResponse(
        session_id=str(session.id),
        trade_count=session.trade_count,
        message=message,
    )


@router.post("/trades/manual", response_model=UploadResponse)
async def manual_entry(
    trades: List[TradeManualEntry],
    db: AsyncSession = Depends(get_db),
):
    """Manually enter trades."""
    if not trades:
        raise HTTPException(status_code=400, detail="No trades provided")

    records = [t.model_dump() for t in trades]
    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    session = await ingest_dataframe(db, df, filename="manual_entry")
    await db.commit()

    return UploadResponse(
        session_id=str(session.id),
        trade_count=session.trade_count,
        message=f"Successfully entered {session.trade_count} trades",
    )
