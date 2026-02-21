"""Rolling time-windowed bias scoring for temporal evolution analysis."""

import pandas as pd
import numpy as np

from app.services.bias_detector import (
    detect_anchoring,
    detect_loss_aversion,
    detect_overconfidence,
    detect_overtrading,
    detect_revenge_trading,
)

BIAS_NAMES = [
    "overtrading",
    "loss_aversion",
    "revenge_trading",
    "anchoring",
    "overconfidence",
]

DETECTORS = {
    "overtrading": detect_overtrading,
    "loss_aversion": detect_loss_aversion,
    "revenge_trading": detect_revenge_trading,
    "anchoring": detect_anchoring,
    "overconfidence": detect_overconfidence,
}

MIN_TRADES_PER_WINDOW = 15
TARGET_POINTS = 60


def _adaptive_window_params(duration_secs: float) -> tuple[float, float]:
    """Return (window_size_secs, step_size_secs) adapted to session length.

    Targets ~TARGET_POINTS output points regardless of session length.
    Window is 4x the step for overlapping coverage and stable scores.
    """
    step = duration_secs / TARGET_POINTS
    step = max(step, 900)  # floor: 15 min (short sessions)

    window = step * 4
    window = max(window, 3600)  # floor: 1 hour

    return window, step


def _ema_smooth(timeline: list[dict], alpha: float = 0.3) -> list[dict]:
    """Apply exponential moving average to bias scores for visual smoothness."""
    if len(timeline) < 2:
        return timeline

    prev = {name: timeline[0][name] for name in BIAS_NAMES}
    for point in timeline:
        for name in BIAS_NAMES:
            prev[name] = alpha * point[name] + (1 - alpha) * prev[name]
            point[name] = round(prev[name], 1)
    return timeline


def rolling_bias_timeline(df: pd.DataFrame) -> list[dict]:
    """Slide a time window across the session and score biases per window.

    Returns a list of dicts, each representing one time-window snapshot
    with scores for all 5 biases.  Output is EMA-smoothed for cleaner
    visualisation.
    """
    if len(df) < MIN_TRADES_PER_WINDOW:
        return []

    t_min = df["timestamp"].min()
    t_max = df["timestamp"].max()
    duration_secs = (t_max - t_min).total_seconds()

    if duration_secs <= 0:
        return []

    window_secs, step_secs = _adaptive_window_params(duration_secs)
    window_td = pd.Timedelta(seconds=window_secs)
    step_td = pd.Timedelta(seconds=step_secs)

    timeline: list[dict] = []
    cursor = t_min

    while cursor + window_td <= t_max + step_td:
        w_start = cursor
        w_end = cursor + window_td
        window_df = df[(df["timestamp"] >= w_start) & (df["timestamp"] < w_end)]

        if len(window_df) >= MIN_TRADES_PER_WINDOW:
            center = w_start + (w_end - w_start) / 2
            point: dict = {
                "timestamp": center.isoformat(),
                "window_start": w_start.isoformat(),
                "window_end": w_end.isoformat(),
                "trade_count": len(window_df),
            }

            best_name, best_score = "", 0.0
            for name, detect_fn in DETECTORS.items():
                try:
                    score, _ = detect_fn(window_df)
                except Exception:
                    score = 0.0
                point[name] = score
                if score > best_score:
                    best_score = score
                    best_name = name

            point["dominant_bias"] = best_name or "none"
            timeline.append(point)

        cursor += step_td

    return _ema_smooth(timeline)
