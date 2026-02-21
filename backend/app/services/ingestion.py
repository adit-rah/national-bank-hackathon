"""Data ingestion service – parse and validate trade data (stateless, no DB)."""

import io
from typing import List

import pandas as pd

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
    """Parse CSV or Excel bytes into a validated DataFrame."""
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