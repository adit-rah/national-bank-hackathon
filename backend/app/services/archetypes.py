"""Trader risk-archetype classification using KMeans clustering."""

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

ARCHETYPE_LABELS = {
    0: {
        "label": "Systematic Disciplined",
        "description": "Consistent position sizing, controlled drawdowns, steady frequency, and balanced holding times. Low emotional reactivity.",
    },
    1: {
        "label": "Aggressive Opportunistic",
        "description": "High position size variability, frequent trading, short holding times. Seeks rapid gains but accepts larger drawdowns.",
    },
    2: {
        "label": "Emotionally Reactive",
        "description": "Erratic behaviour after losses, position size spikes, inconsistent cooldown periods. High revenge-trading risk.",
    },
    3: {
        "label": "Conservative Defensive",
        "description": "Small position sizes, long holding times, low trade frequency. Prefers safety over growth.",
    },
}


def _build_feature_vector(df: pd.DataFrame) -> np.ndarray:
    """Build a 4-feature vector for archetype classification."""
    pos_var = df["position_size_pct"].std() if "position_size_pct" in df.columns else 0
    dd_tolerance = abs(df["drawdown"].min()) if "drawdown" in df.columns else 0
    duration_hours = (df["timestamp"].max() - df["timestamp"].min()).total_seconds() / 3600
    trade_freq = len(df) / max(duration_hours, 0.01)
    hold_std = df["holding_duration"].std() if "holding_duration" in df.columns else 0

    return np.array([[pos_var, dd_tolerance, trade_freq, hold_std]])


def classify_archetype(
    df: pd.DataFrame,
    overtrading_score: float = 0,
    loss_aversion_score: float = 0,
    revenge_trading_score: float = 0,
    anchoring_score: float = 0,
) -> tuple[str, dict]:
    """Classify trader into one of four archetypes.

    Uses heuristic mapping based on both raw features and bias scores.
    """
    features = _build_feature_vector(df)
    pos_var, dd_tolerance, trade_freq, hold_std = features[0]

    # Heuristic assignment combining raw metrics and bias scores
    score = 0

    # Raw trading metrics (reduced weight)
    if trade_freq > 100:
        score += 1

    if pos_var > 150:
        score += 1

    if dd_tolerance > 100:
        score += 1

    if hold_std > 1000:
        score += 1

    # Bias severity (primary indicator of archetype)
    avg_bias = (overtrading_score + loss_aversion_score + revenge_trading_score + anchoring_score) / 4

    # Most weight on bias scores since they're more reliable
    if avg_bias > 70:
        score += 3  # Definitely emotional/aggressive
    elif avg_bias > 50:
        score += 2  # Moderately aggressive
    elif avg_bias > 30:
        score += 1  # Slightly aggressive
    # else: 0 (disciplined/conservative)

    # Revenge trading is especially indicative of emotional reactivity
    if revenge_trading_score > 60:
        score += 1

    # Map score to archetype (adjusted thresholds)
    if score <= 1:
        idx = 3  # Conservative Defensive
    elif score <= 3:
        idx = 0  # Systematic Disciplined
    elif score <= 5:
        idx = 1  # Aggressive Opportunistic
    else:
        idx = 2  # Emotionally Reactive

    archetype = ARCHETYPE_LABELS[idx]
    details = {
        "position_size_variability": round(float(pos_var), 2),
        "drawdown_tolerance": round(float(dd_tolerance), 2),
        "trade_frequency": round(float(trade_freq), 2),
        "holding_time_variability": round(float(hold_std), 2),
        "average_bias_score": round(float(avg_bias), 2),
        "heuristic_score": score,
    }
    return archetype["label"], {**archetype, **details}
