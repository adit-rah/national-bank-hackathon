"""Counterfactual simulator – replay trade history under constraints."""

import logging
import time

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def simulate(
    df: pd.DataFrame,
    max_position_pct: float | None = None,
    stop_loss_pct: float | None = None,
    max_daily_trades: int | None = None,
    cooldown_minutes: float | None = None,
    max_loss_streak: int | None = None,
    max_drawdown_trigger_pct: float | None = None,
) -> dict:
    """Replay trades with constraints and return comparison metrics.

    Parameters
    ----------
    df : DataFrame with computed features (from compute_trade_features)
    max_position_pct : cap position size at this % of balance
    stop_loss_pct : close trade if loss exceeds this % of balance
    max_daily_trades : maximum trades per calendar day
    cooldown_minutes : minimum minutes between consecutive trades
    max_loss_streak : stop trading after N consecutive losses
    max_drawdown_trigger_pct : pause trading when drawdown exceeds this %

    Returns dict with original metrics, simulated metrics, improvement,
    equity curves, and excluded_breakdown.
    """
    t0 = time.perf_counter()
    logger.info(
        "Counterfactual simulation started | trades=%d position_cap=%s stop_loss=%s "
        "daily_limit=%s cooldown=%s loss_streak=%s drawdown_trigger=%s",
        len(df), max_position_pct, stop_loss_pct, max_daily_trades,
        cooldown_minutes, max_loss_streak, max_drawdown_trigger_pct,
    )

    sim = df.copy()
    sim["included"] = True
    sim["excluded_by"] = None

    breakdown: dict[str, int] = {}

    # ── 1. Max daily trades ────────────────────────────────────────
    if max_daily_trades is not None:
        sim["trade_date"] = sim["timestamp"].dt.date
        sim["daily_rank"] = sim.groupby("trade_date").cumcount() + 1
        mask = sim["included"] & (sim["daily_rank"] > max_daily_trades)
        sim.loc[mask, "included"] = False
        sim.loc[mask, "excluded_by"] = "daily_limit"
        breakdown["daily_limit"] = int(mask.sum())

    # ── 2. Cooldown period ─────────────────────────────────────────
    if cooldown_minutes is not None:
        cooldown_sec = cooldown_minutes * 60
        last_allowed = pd.NaT
        cooldown_count = 0
        for i in sim.index:
            if not sim.at[i, "included"]:
                continue
            if last_allowed is not pd.NaT and (sim.at[i, "timestamp"] - last_allowed).total_seconds() < cooldown_sec:
                sim.at[i, "included"] = False
                sim.at[i, "excluded_by"] = "cooldown"
                cooldown_count += 1
            else:
                last_allowed = sim.at[i, "timestamp"]
        breakdown["cooldown"] = cooldown_count

    # ── 3. Loss-streak breaker ─────────────────────────────────────
    if max_loss_streak is not None and "streak_index" in sim.columns:
        mask = sim["included"] & (sim["streak_index"] <= -max_loss_streak)
        sim.loc[mask, "included"] = False
        sim.loc[mask, "excluded_by"] = "loss_streak"
        breakdown["loss_streak"] = int(mask.sum())

    # ── 4. Drawdown circuit breaker ────────────────────────────────
    if max_drawdown_trigger_pct is not None and "drawdown_at_trade" in sim.columns:
        mask = sim["included"] & (sim["drawdown_at_trade"] < -max_drawdown_trigger_pct)
        sim.loc[mask, "included"] = False
        sim.loc[mask, "excluded_by"] = "drawdown_breaker"
        breakdown["drawdown_breaker"] = int(mask.sum())

    # ── 5. Cap position size ───────────────────────────────────────
    if max_position_pct is not None:
        mask = sim["included"] & (sim["position_size_pct"] > max_position_pct)
        if mask.any():
            scale = max_position_pct / sim.loc[mask, "position_size_pct"]
            sim.loc[mask, "profit_loss"] = sim.loc[mask, "profit_loss"] * scale
            sim.loc[mask, "quantity"] = sim.loc[mask, "quantity"] * scale
            sim.loc[mask, "position_size_pct"] = max_position_pct
            breakdown["position_cap_scaled"] = int(mask.sum())

    # ── 6. Stop-loss (uses running simulated balance) ──────────────
    start_bal = df["balance"].iloc[0] - df["profit_loss"].iloc[0]
    if stop_loss_pct is not None:
        running_bal = start_bal
        sl_count = 0
        for i in sim.index:
            if not sim.at[i, "included"]:
                continue
            if running_bal != 0:
                pnl = sim.at[i, "profit_loss"]
                loss_pct = abs(pnl) / abs(running_bal) * 100
                if pnl < 0 and loss_pct > stop_loss_pct:
                    sim.at[i, "profit_loss"] = -abs(running_bal) * stop_loss_pct / 100
                    sl_count += 1
            running_bal += sim.at[i, "profit_loss"]
        breakdown["stop_loss_capped"] = sl_count

    # Remove zero-count entries
    breakdown = {k: v for k, v in breakdown.items() if v > 0}

    # ── Recalculate simulated balance ──────────────────────────────
    included = sim[sim["included"]].copy()
    if len(included) == 0:
        logger.warning("All %d trades excluded by constraints", len(df))
        return _empty_result(df, breakdown)

    included["sim_balance"] = start_bal + included["profit_loss"].cumsum()

    # ── Compute metrics ────────────────────────────────────────────
    orig_metrics = _compute_metrics(df, "balance")
    sim_metrics = _compute_metrics(included, "sim_balance")

    improvement = {}
    for key in orig_metrics:
        o = orig_metrics[key]
        s = sim_metrics[key]
        if isinstance(o, (int, float)) and o != 0:
            improvement[key] = round((s - o) / abs(o) * 100, 2)
        else:
            improvement[key] = 0

    # Equity curves (vectorized)
    orig_curve = _build_equity_curve(df, "balance")
    sim_curve = _build_equity_curve(included, "sim_balance")

    # Extend simulated curve to match original timeline so the chart
    # doesn't stop short when late trades are excluded.
    if sim_curve and orig_curve and sim_curve[-1]["timestamp"] < orig_curve[-1]["timestamp"]:
        sim_curve.append({"timestamp": orig_curve[-1]["timestamp"], "balance": sim_curve[-1]["balance"]})

    # Summary
    parts = []
    if "max_drawdown_pct" in improvement and improvement["max_drawdown_pct"] != 0:
        parts.append(f"max drawdown would change by {improvement['max_drawdown_pct']:+.1f}%")
    if "total_pnl" in improvement and improvement["total_pnl"] != 0:
        parts.append(f"total PnL would change by {improvement['total_pnl']:+.1f}%")
    if "sharpe_ratio" in improvement and improvement["sharpe_ratio"] != 0:
        parts.append(f"Sharpe ratio would change by {improvement['sharpe_ratio']:+.1f}%")
    summary = "With these constraints, " + ", ".join(parts) + "." if parts else "No significant change."

    elapsed_ms = (time.perf_counter() - t0) * 1000
    logger.info(
        "Counterfactual simulation complete | included=%d/%d elapsed=%.1fms breakdown=%s",
        len(included), len(df), elapsed_ms, breakdown,
    )

    return {
        "original": orig_metrics,
        "simulated": sim_metrics,
        "improvement": improvement,
        "summary": summary,
        "equity_curve_original": orig_curve,
        "equity_curve_simulated": sim_curve,
        "trades_original": len(df),
        "trades_simulated": len(included),
        "excluded_breakdown": breakdown,
    }


def _compute_metrics(df: pd.DataFrame, balance_col: str) -> dict:
    pnl = df["profit_loss"]
    bal = df[balance_col]
    peak = bal.cummax()
    dd = ((bal - peak) / peak.replace(0, np.nan) * 100).fillna(0)

    sharpe = 0.0
    if pnl.std() != 0:
        sharpe = float((pnl.mean() / pnl.std()) * np.sqrt(252))

    return {
        "total_trades": len(df),
        "total_pnl": round(float(pnl.sum()), 2),
        "final_balance": round(float(bal.iloc[-1]), 2),
        "max_drawdown_pct": round(abs(float(dd.min())), 2),
        "sharpe_ratio": round(sharpe, 4),
        "volatility": round(float(pnl.std()), 2),
        "win_rate": round(float((pnl > 0).sum() / len(pnl) * 100), 2) if len(pnl) else 0,
    }


def _build_equity_curve(df: pd.DataFrame, balance_col: str) -> list[dict]:
    timestamps = df["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%S").tolist()
    balances = df[balance_col].round(2).tolist()
    return [
        {"timestamp": ts, "balance": float(bal)}
        for ts, bal in zip(timestamps, balances)
    ]


def _empty_result(df: pd.DataFrame, breakdown: dict | None = None) -> dict:
    orig = _compute_metrics(df, "balance")
    return {
        "original": orig,
        "simulated": {k: 0 for k in orig},
        "improvement": {k: 0 for k in orig},
        "summary": "All trades were excluded by the constraints.",
        "equity_curve_original": _build_equity_curve(df, "balance"),
        "equity_curve_simulated": [],
        "trades_original": len(df),
        "trades_simulated": 0,
        "excluded_breakdown": breakdown or {},
    }
