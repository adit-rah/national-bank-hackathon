def score_to_band(score: float) -> str:
    """Convert a 0-100 bias score to a human-readable band."""
    if score < 30:
        return "disciplined"
    elif score < 60:
        return "elevated"
    else:
        return "high_risk"


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    """Clamp a value between low and high."""
    return max(low, min(high, value))
