"""Data ingestion service – parse, validate, and bulk-load trade data."""

import io
import uuid
from datetime import datetime
from typing import List

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AnalysisSession, Trade

REQUIRED_COLUMNS = [
    "timestamp", "asset", "side", "quantity",
    "entry_price", "exit_price", "profit_loss", "balance",
]

COLUMN_ALIASES = {
    "pnl": "profit_loss",
    "p&l": "profit_loss",
    "p_l": "profit_loss",
    "account_balance": "balance",
}


def _normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Lower-case columns and apply known aliases."""
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    df.rename(columns=COLUMN_ALIASES, inplace=True)
    return df


def _validate(df: pd.DataFrame) -> List[str]:
    """Return list of missing required columns."""
    return [c for c in REQUIRED_COLUMNS if c not in df.columns]


def parse_file(contents: bytes, filename: str) -> pd.DataFrame:
    """Parse CSV or Excel bytes into a DataFrame."""
    if filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(io.BytesIO(contents))
    else:
        df = pd.read_csv(io.BytesIO(contents))

    df = _normalise_columns(df)
    missing = _validate(df)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Coerce types
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    for col in ["quantity", "entry_price", "exit_price", "profit_loss", "balance"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df.sort_values("timestamp", inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


async def ingest_dataframe(
    db: AsyncSession, df: pd.DataFrame, filename: str | None = None
) -> AnalysisSession:
    """Bulk-insert a DataFrame of trades and create an AnalysisSession."""
    session = AnalysisSession(
        id=uuid.uuid4(),
        filename=filename,
        trade_count=len(df),
        status="processing",
        created_at=datetime.utcnow(),
    )
    db.add(session)
    await db.flush()

    # Chunked insert (10 000 rows at a time)
    chunk_size = 10_000
    for start in range(0, len(df), chunk_size):
        chunk = df.iloc[start : start + chunk_size]
        trades = [
            Trade(
                id=uuid.uuid4(),
                session_id=session.id,
                timestamp=row["timestamp"],
                asset=str(row["asset"]),
                side=str(row["side"]),
                quantity=row.get("quantity"),
                entry_price=row.get("entry_price"),
                exit_price=row.get("exit_price"),
                profit_loss=row.get("profit_loss"),
                balance=row.get("balance"),
            )
            for _, row in chunk.iterrows()
        ]
        db.add_all(trades)
        await db.flush()

    session.status = "completed"
    return session
