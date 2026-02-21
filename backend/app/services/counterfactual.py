"""Counterfactual simulator – replay trade history under constraints."""

import numpy as np
import pandas as pd


def simulate(
    df: pd.DataFrame,
    max_position_pct: float | None = None,
    stop_loss_pct: float | None = None,
    max_daily_trades: int | None = None,
    cooldown_minutes: float | None = None,
) -> dict:
    """Replay trades with constraints and return comparison metrics.

    Parameters
    ----------
    df : DataFrame with computed features (from compute_trade_features)
    max_position_pct : cap position size at this % of balance
    stop_loss_pct : close trade if loss exceeds this % of balance
    max_daily_trades : maximum trades per calendar day
    cooldown_minutes : minimum minutes between consecutive trades

    Returns dict with original metrics, simulated metrics, improvement, and equity curves.
    """
    sim = df.copy()
    sim["included"] = True

    # ── 1. Max daily trades ────────────────────────────────────────
    if max_daily_trades is not None:
        sim["trade_date"] = sim["timestamp"].dt.date
        sim["daily_rank"] = sim.groupby("trade_date").cumcount() + 1
        sim.loc[sim["daily_rank"] > max_daily_trades, "included"] = False

    # ── 2. Cooldown period ─────────────────────────────────────────
    if cooldown_minutes is not None:
        cooldown_sec = cooldown_minutes * 60
        last_allowed = pd.NaT
        for i in sim.index:
            if not sim.at[i, "included"]:
                continue
            if last_allowed is not pd.NaT and (sim.at[i, "timestamp"] - last_allowed).total_seconds() < cooldown_sec:
                sim.at[i, "included"] = False
            else:
                last_allowed = sim.at[i, "timestamp"]

    # ── 3. Cap position size ───────────────────────────────────────
    if max_position_pct is not None:
        mask = sim["included"] & (sim["position_size_pct"] > max_position_pct)
        if mask.any():
            scale = max_position_pct / sim.loc[mask, "position_size_pct"]
            sim.loc[mask, "profit_loss"] = sim.loc[mask, "profit_loss"] * scale
            sim.loc[mask, "quantity"] = sim.loc[mask, "quantity"] * scale
            sim.loc[mask, "position_size_pct"] = max_position_pct

    # ── 4. Stop-loss ───────────────────────────────────────────────
    if stop_loss_pct is not None:
        for i in sim.index:
            if not sim.at[i, "included"]:
                continue
            bal = sim.at[i, "balance"]
            if bal != 0:
                loss_pct = abs(sim.at[i, "profit_loss"]) / abs(bal) * 100
                if sim.at[i, "profit_loss"] < 0 and loss_pct > stop_loss_pct:
                    # Cap the loss at stop_loss_pct of balance
                    max_loss = -abs(bal) * stop_loss_pct / 100
                    sim.at[i, "profit_loss"] = max_loss

    # ── Recalculate simulated balance ──────────────────────────────
    included = sim[sim["included"]].copy()
    if len(included) == 0:
        return _empty_result(df)

    start_bal = df["balance"].iloc[0] - df["profit_loss"].iloc[0]
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

    # Equity curves
    orig_curve = [
        {"timestamp": r["timestamp"].isoformat(), "balance": round(float(r["balance"]), 2)}
        for _, r in df[["timestamp", "balance"]].iterrows()
    ]
    sim_curve = [
        {"timestamp": r["timestamp"].isoformat(), "balance": round(float(r["sim_balance"]), 2)}
        for _, r in included[["timestamp", "sim_balance"]].iterrows()
    ]

    # Summary
    parts = []
    if "max_drawdown_pct" in improvement and improvement["max_drawdown_pct"] != 0:
        parts.append(f"max drawdown would change by {improvement['max_drawdown_pct']:+.1f}%")
    if "total_pnl" in improvement and improvement["total_pnl"] != 0:
        parts.append(f"total PnL would change by {improvement['total_pnl']:+.1f}%")
    if "sharpe_ratio" in improvement and improvement["sharpe_ratio"] != 0:
        parts.append(f"Sharpe ratio would change by {improvement['sharpe_ratio']:+.1f}%")
    summary = "With these constraints, " + ", ".join(parts) + "." if parts else "No significant change."

    return {
        "original": orig_metrics,
        "simulated": sim_metrics,
        "improvement": improvement,
        "summary": summary,
        "equity_curve_original": orig_curve,
        "equity_curve_simulated": sim_curve,
        "trades_original": len(df),
        "trades_simulated": len(included),
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
        "max_drawdown_pct": round(float(dd.min()), 2),
        "sharpe_ratio": round(sharpe, 4),
        "volatility": round(float(pnl.std()), 2),
        "win_rate": round(float((pnl > 0).sum() / len(pnl) * 100), 2) if len(pnl) else 0,
    }


def _empty_result(df: pd.DataFrame) -> dict:
    orig = _compute_metrics(df, "balance")
    return {
        "original": orig,
        "simulated": {k: 0 for k in orig},
        "improvement": {k: 0 for k in orig},
        "summary": "All trades were excluded by the constraints.",
        "equity_curve_original": [],
        "equity_curve_simulated": [],
        "trades_original": len(df),
        "trades_simulated": 0,
    }
