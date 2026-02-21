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


def classify_archetype(df: pd.DataFrame) -> tuple[str, dict]:
    """Classify trader into one of four archetypes.

    Uses heuristic mapping when there's only one session (can't cluster 1 point).
    """
    features = _build_feature_vector(df)
    pos_var, dd_tolerance, trade_freq, hold_std = features[0]

    # Heuristic assignment (single-session, no clustering possible)
    score = 0
    if trade_freq > 10:
        score += 2
    elif trade_freq > 5:
        score += 1

    if pos_var > 50:
        score += 2
    elif pos_var > 20:
        score += 1

    if dd_tolerance > 30:
        score += 1

    if hold_std > 300:
        score += 1

    # Map score to archetype
    if score <= 1:
        idx = 3  # Conservative
    elif score <= 3:
        idx = 0  # Systematic
    elif score <= 5:
        idx = 1  # Aggressive
    else:
        idx = 2  # Emotionally Reactive

    archetype = ARCHETYPE_LABELS[idx]
    details = {
        "position_size_variability": round(float(pos_var), 2),
        "drawdown_tolerance": round(float(dd_tolerance), 2),
        "trade_frequency": round(float(trade_freq), 2),
        "holding_time_variability": round(float(hold_std), 2),
        "heuristic_score": score,
    }
    return archetype["label"], {**archetype, **details}
