"""Composite bias scoring layer — orchestrates detection and returns structured results."""

import pandas as pd

from app.services.bias_detector import (
    detect_loss_aversion,
    detect_overtrading,
    detect_revenge_trading,
    detect_anchoring,
)
from app.services.features import (
    build_equity_curve,
    build_holding_time_comparison,
    build_position_scatter,
    build_trade_frequency,
    compute_summary_stats,
    compute_trade_features,
)
from app.services.archetypes import classify_archetype
from app.utils import score_to_band


def run_full_analysis(df: pd.DataFrame) -> dict:
    """Run the complete analysis pipeline on a trade DataFrame.

    Returns a dict ready to be serialised into AnalysisResponse.
    """
    # 1. Feature engineering
    df = compute_trade_features(df)

    # 2. Summary stats
    summary = compute_summary_stats(df)

    # 3. Bias detection
    ot_score, ot_details = detect_overtrading(df)
    la_score, la_details = detect_loss_aversion(df)
    rt_score, rt_details = detect_revenge_trading(df)
    an_score, an_details = detect_anchoring(df)

    # 4. Archetype classification (with bias scores)
    archetype_label, archetype_details = classify_archetype(
        df,
        overtrading_score=ot_score,
        loss_aversion_score=la_score,
        revenge_trading_score=rt_score,
        anchoring_score=an_score,
    )

    # 5. Visualisation data
    equity_curve = build_equity_curve(df)
    trade_freq = build_trade_frequency(df)
    holding_cmp = build_holding_time_comparison(df)
    pos_scatter = build_position_scatter(df)

    return {
        "feature_summary": summary,
        "overtrading": {
            "score": ot_score,
            "band": score_to_band(ot_score),
            "details": ot_details,
        },
        "loss_aversion": {
            "score": la_score,
            "band": score_to_band(la_score),
            "details": la_details,
        },
        "revenge_trading": {
            "score": rt_score,
            "band": score_to_band(rt_score),
            "details": rt_details,
        },
        "anchoring": {
            "score": an_score,
            "band": score_to_band(an_score),
            "details": an_details,
        },
        "archetype": {
            "label": archetype_label,
            "details": archetype_details,
        },
        "equity_curve": equity_curve,
        "trade_frequency": trade_freq,
        "holding_time_comparison": holding_cmp,
        "position_scatter": pos_scatter,
        "featured_df": df,  # kept for counterfactual / coach use; not serialised
    }
