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


def _validate_rows(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Remove invalid rows and return (cleaned_df, validation_stats)."""
    import logging
    logger = logging.getLogger(__name__)

    initial = len(df)
    stats = {
        "initial_rows": initial,
        "removed_missing": 0,
        "removed_invalid_side": 0,
        "removed_invalid_values": 0,
        "invalid_rows": [],
    }

    # 1. Drop rows with critical NaN values
    before = len(df)
    missing_mask = df[["timestamp", "asset", "side", "quantity", "balance"]].isnull().any(axis=1)
    if missing_mask.sum() > 0:
        invalid_rows = df[missing_mask].index.tolist()
        stats["invalid_rows"].extend([
            {"row": int(idx), "reason": "missing_critical_field", "data": str(df.loc[idx].to_dict())}
            for idx in invalid_rows[:5]  # Log first 5
        ])
        logger.warning(f"Removing {missing_mask.sum()} rows with missing critical fields (rows: {invalid_rows[:10]})")

    df = df.dropna(subset=["timestamp", "asset", "side", "quantity", "balance"])
    stats["removed_missing"] = before - len(df)

    # 2. Validate and normalize side values
    df = df.copy()  # Avoid SettingWithCopyWarning
    df["side"] = df["side"].str.upper().str.strip()
    before = len(df)
    invalid_side_mask = ~df["side"].isin(["BUY", "SELL"])
    if invalid_side_mask.sum() > 0:
        invalid_rows = df[invalid_side_mask].index.tolist()
        logger.warning(f"Removing {invalid_side_mask.sum()} rows with invalid side values (rows: {invalid_rows[:10]})")

    df = df[df["side"].isin(["BUY", "SELL"])]
    stats["removed_invalid_side"] = before - len(df)

    # 3. Remove impossible values
    before = len(df)
    invalid_value_mask = (df["quantity"] <= 0) | (df["entry_price"] <= 0) | (df["exit_price"] <= 0)
    if invalid_value_mask.sum() > 0:
        invalid_rows = df[invalid_value_mask].index.tolist()
        logger.warning(f"Removing {invalid_value_mask.sum()} rows with invalid values (quantity/price <= 0) (rows: {invalid_rows[:10]})")

    df = df[
        (df["quantity"] > 0) &
        (df["entry_price"] > 0) &
        (df["exit_price"] > 0)
    ]
    stats["removed_invalid_values"] = before - len(df)

    stats["final_rows"] = len(df)
    stats["total_removed"] = initial - len(df)
    stats["removal_percentage"] = round((stats["total_removed"] / initial * 100), 2) if initial > 0 else 0

    if stats["total_removed"] > 0:
        logger.info(
            f"Data validation summary: {initial} → {stats['final_rows']} rows "
            f"({stats['total_removed']} removed: {stats['removed_missing']} missing, "
            f"{stats['removed_invalid_side']} invalid side, {stats['removed_invalid_values']} invalid values)"
        )

    return df, stats


def parse_file(contents: bytes, filename: str) -> tuple[pd.DataFrame, dict]:
    """Parse CSV or Excel bytes into a DataFrame. Returns (df, validation_stats)."""
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

    # Validate and clean rows
    df, validation_stats = _validate_rows(df)

    if len(df) == 0:
        raise ValueError("No valid rows after validation - all rows had critical errors")

    df.sort_values("timestamp", inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df, validation_stats


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
