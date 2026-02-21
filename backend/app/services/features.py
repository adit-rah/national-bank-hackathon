"""Vectorised feature engineering on trade DataFrames."""

import numpy as np
import pandas as pd


def compute_trade_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add all trade-level and psychological-signal features.

    Expects columns: timestamp, asset, side, quantity, entry_price,
    exit_price, profit_loss, balance.  Modifies df **in-place** and returns it.
    """
    df = df.copy()
    df.sort_values("timestamp", inplace=True)
    df.reset_index(drop=True, inplace=True)

    # ── Basic derived ──────────────────────────────────────────────
    df["is_win"] = df["profit_loss"] > 0
    df["pnl_percent"] = (df["profit_loss"] / df["balance"].shift(1).fillna(df["balance"])) * 100
    df["notional"] = df["quantity"].fillna(0) * df["entry_price"].fillna(0)
    df["position_size_pct"] = (df["notional"] / df["balance"].abs().replace(0, np.nan)) * 100

    # ── Holding duration (proxy: time between consecutive trades) ──
    df["time_since_last"] = df["timestamp"].diff().dt.total_seconds().fillna(0)
    df["holding_duration"] = df["time_since_last"]  # best proxy without explicit close time

    # ── Peak balance & drawdown ────────────────────────────────────
    df["peak_balance"] = df["balance"].cummax()
    df["drawdown"] = (df["balance"] - df["peak_balance"]) / df["peak_balance"].replace(0, np.nan) * 100
    df["drawdown_at_trade"] = df["drawdown"]

    # ── Streaks ────────────────────────────────────────────────────
    win_flag = df["is_win"].astype(int)
    streak_groups = (win_flag != win_flag.shift()).cumsum()
    df["streak_index"] = df.groupby(streak_groups).cumcount() + 1
    df.loc[~df["is_win"], "streak_index"] = -df.loc[~df["is_win"], "streak_index"]

    # ── Rolling trade clusters (time-based) ─────────────────────────
    df["ts_epoch"] = df["timestamp"].astype(np.int64) // 10**9
    # Use searchsorted for O(n log n) time-based window counting
    epochs = df["ts_epoch"].values
    trades_1h = np.empty(len(df), dtype=np.float64)
    trades_4h = np.empty(len(df), dtype=np.float64)
    for i in range(len(df)):
        t = epochs[i]
        trades_1h[i] = np.searchsorted(epochs, t, side="right") - np.searchsorted(epochs, t - 3600, side="left")
        trades_4h[i] = np.searchsorted(epochs, t, side="right") - np.searchsorted(epochs, t - 14400, side="left")
    df["trades_1h"] = trades_1h
    df["trades_4h"] = trades_4h

    # ── Volatility proxy (rolling std of pnl) ──────────────────────
    df["volatility_proxy"] = df["profit_loss"].rolling(window=20, min_periods=1).std().fillna(0)

    # ── Post-loss indicators ───────────────────────────────────────
    df["prev_win"] = df["is_win"].shift(1).fillna(True).astype(bool)
    df["after_loss"] = ~df["prev_win"]

    # Position size change after loss
    df["prev_notional"] = df["notional"].shift(1)
    df["size_delta"] = (df["notional"] - df["prev_notional"]) / df["prev_notional"].replace(0, np.nan)

    return df


def compute_summary_stats(df: pd.DataFrame) -> dict:
    """Return a summary dict for the whole session."""
    wins = df[df["is_win"]]
    losses = df[~df["is_win"]]

    total_trades = len(df)
    win_rate = len(wins) / total_trades * 100 if total_trades else 0

    avg_win = wins["profit_loss"].mean() if len(wins) else 0
    avg_loss = losses["profit_loss"].mean() if len(losses) else 0
    avg_holding_win = wins["holding_duration"].mean() if len(wins) else 0
    avg_holding_loss = losses["holding_duration"].mean() if len(losses) else 0

    # Time span
    duration_hours = (df["timestamp"].max() - df["timestamp"].min()).total_seconds() / 3600 if total_trades > 1 else 0
    trades_per_hour = total_trades / duration_hours if duration_hours > 0 else 0

    # Sharpe-like ratio (annualised, simplified)
    if df["profit_loss"].std() != 0:
        sharpe = (df["profit_loss"].mean() / df["profit_loss"].std()) * np.sqrt(252)
    else:
        sharpe = 0.0

    max_drawdown = df["drawdown"].min() if "drawdown" in df.columns else 0
    final_balance = df["balance"].iloc[-1] if total_trades else 0
    total_pnl = df["profit_loss"].sum()

    return {
        "total_trades": total_trades,
        "win_rate": round(win_rate, 2),
        "avg_win": round(float(avg_win), 2),
        "avg_loss": round(float(avg_loss), 2),
        "avg_holding_win_sec": round(float(avg_holding_win), 2),
        "avg_holding_loss_sec": round(float(avg_holding_loss), 2),
        "trades_per_hour": round(trades_per_hour, 2),
        "sharpe_ratio": round(float(sharpe), 4),
        "max_drawdown_pct": round(float(max_drawdown), 2),
        "final_balance": round(float(final_balance), 2),
        "total_pnl": round(float(total_pnl), 2),
        "duration_hours": round(float(duration_hours), 2),
    }


def build_equity_curve(df: pd.DataFrame) -> list[dict]:
    """Build equity curve data for Plotly."""
    return [
        {
            "timestamp": row["timestamp"].isoformat(),
            "balance": round(float(row["balance"]), 2),
            "drawdown": round(float(row.get("drawdown", 0)), 2),
        }
        for _, row in df[["timestamp", "balance", "drawdown"]].iterrows()
    ]


def build_trade_frequency(df: pd.DataFrame) -> dict:
    """Hour-of-day × day-of-week frequency matrix."""
    df_copy = df.copy()
    df_copy["hour"] = df_copy["timestamp"].dt.hour
    df_copy["day"] = df_copy["timestamp"].dt.dayofweek  # 0=Mon
    freq = df_copy.groupby(["day", "hour"]).size().reset_index(name="count")
    return {
        "days": freq["day"].tolist(),
        "hours": freq["hour"].tolist(),
        "counts": freq["count"].tolist(),
    }


def build_holding_time_comparison(df: pd.DataFrame) -> dict:
    """Holding times split by win/loss."""
    wins = df[df["is_win"]]["holding_duration"].dropna()
    losses = df[~df["is_win"]]["holding_duration"].dropna()
    return {
        "win_mean": round(float(wins.mean()), 2) if len(wins) else 0,
        "win_median": round(float(wins.median()), 2) if len(wins) else 0,
        "loss_mean": round(float(losses.mean()), 2) if len(losses) else 0,
        "loss_median": round(float(losses.median()), 2) if len(losses) else 0,
        "win_values": wins.tolist()[:500],  # cap for payload size
        "loss_values": losses.tolist()[:500],
    }


def build_position_scatter(df: pd.DataFrame) -> list[dict]:
    """Position size vs PnL scatter data."""
    sample = df.sample(min(len(df), 1000), random_state=42) if len(df) > 1000 else df
    return [
        {
            "position_size": round(float(row.get("position_size_pct", 0)), 2),
            "pnl": round(float(row["profit_loss"]), 2),
            "is_win": bool(row["is_win"]),
            "asset": str(row["asset"]),
        }
        for _, row in sample.iterrows()
    ]
