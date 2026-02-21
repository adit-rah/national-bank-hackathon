"""Bias detection engine — overtrading, loss aversion, revenge trading.

Each bias is scored 0–100 (continuous) with supporting detail dicts.
"""

import numpy as np
import pandas as pd
from scipy import stats

from app.utils import clamp


# ──────────────────────────────────────────────────────────────────────────────
# Overtrading
# ──────────────────────────────────────────────────────────────────────────────

def detect_overtrading(df: pd.DataFrame) -> tuple[float, dict]:
    """Score 0-100 for overtrading tendency."""
    details: dict = {}

    # 1. Trade frequency z-score
    duration_hours = (df["timestamp"].max() - df["timestamp"].min()).total_seconds() / 3600
    if duration_hours <= 0:
        return 0.0, {"reason": "insufficient_data"}

    trades_per_hour = len(df) / duration_hours
    details["trades_per_hour"] = round(trades_per_hour, 2)

    # Baseline: assume 2-5 trades/hour is normal
    baseline_mean, baseline_std = 3.5, 2.0
    freq_z = (trades_per_hour - baseline_mean) / baseline_std
    freq_score = clamp(freq_z * 20 + 30, 0, 100)
    details["frequency_z_score"] = round(freq_z, 3)

    # 2. Correlation between loss streak and trade frequency
    if "streak_index" in df.columns and "trades_1h" in df.columns:
        loss_mask = df["streak_index"] < 0
        if loss_mask.sum() > 5:
            corr, p_val = stats.pearsonr(
                df.loc[loss_mask, "streak_index"].abs(),
                df.loc[loss_mask, "trades_1h"],
            )
            details["loss_streak_freq_corr"] = round(float(corr), 4)
            details["loss_streak_freq_pval"] = round(float(p_val), 6)
            corr_score = clamp(float(corr) * 60 + 30, 0, 100)
        else:
            corr_score = 0
    else:
        corr_score = 0

    # 3. Post-loss frequency increase
    if "after_loss" in df.columns:
        post_loss_freq = df[df["after_loss"]]["time_since_last"].mean()
        normal_freq = df[~df["after_loss"]]["time_since_last"].mean()
        if normal_freq and normal_freq > 0 and post_loss_freq and post_loss_freq > 0:
            # Ratio < 1 means trading faster after losses → overtrading signal
            ratio = post_loss_freq / normal_freq
            pl_score = clamp((1 - ratio) * 100 + 30, 0, 100)
            details["post_loss_cooldown_ratio"] = round(ratio, 3)
        else:
            pl_score = 0
    else:
        pl_score = 0

    # 4. Rolling cluster density
    if "trades_1h" in df.columns:
        cluster_density = df["trades_1h"].mean()
        cluster_score = clamp((cluster_density - 3) * 10, 0, 100)
        details["avg_cluster_density_1h"] = round(float(cluster_density), 2)
    else:
        cluster_score = 0

    composite = 0.35 * freq_score + 0.25 * corr_score + 0.20 * pl_score + 0.20 * cluster_score
    details["sub_scores"] = {
        "frequency": round(freq_score, 1),
        "loss_streak_correlation": round(corr_score, 1),
        "post_loss_frequency": round(pl_score, 1),
        "cluster_density": round(cluster_score, 1),
    }
    return round(clamp(composite), 1), details


# ──────────────────────────────────────────────────────────────────────────────
# Loss Aversion
# ──────────────────────────────────────────────────────────────────────────────

def detect_loss_aversion(df: pd.DataFrame) -> tuple[float, dict]:
    """Score 0-100 for loss aversion."""
    details: dict = {}
    wins = df[df["is_win"]]
    losses = df[~df["is_win"]]

    if len(wins) < 5 or len(losses) < 5:
        return 0.0, {"reason": "insufficient_data"}

    # 1. Holding asymmetry: losses held longer than wins
    avg_hold_win = wins["holding_duration"].mean()
    avg_hold_loss = losses["holding_duration"].mean()
    if avg_hold_win > 0:
        hold_ratio = avg_hold_loss / avg_hold_win
    else:
        hold_ratio = 1.0
    details["holding_ratio_loss_to_win"] = round(float(hold_ratio), 3)
    hold_score = clamp((hold_ratio - 1) * 60 + 20, 0, 100)

    # t-test on holding times
    t_stat, p_val = stats.ttest_ind(
        losses["holding_duration"].dropna(),
        wins["holding_duration"].dropna(),
        equal_var=False,
    )
    details["holding_ttest_t"] = round(float(t_stat), 4)
    details["holding_ttest_p"] = round(float(p_val), 6)
    details["holding_significant"] = bool(p_val < 0.05)

    # 2. Loss magnitude asymmetry
    avg_loss_size = abs(losses["profit_loss"].mean())
    avg_win_size = abs(wins["profit_loss"].mean())
    if avg_win_size > 0:
        magnitude_ratio = avg_loss_size / avg_win_size
    else:
        magnitude_ratio = 1.0
    details["loss_win_magnitude_ratio"] = round(float(magnitude_ratio), 3)
    mag_score = clamp((magnitude_ratio - 1) * 50 + 25, 0, 100)

    # 3. Median vs mean loss divergence (skew signal)
    median_loss = abs(losses["profit_loss"].median())
    mean_loss = avg_loss_size
    if median_loss > 0:
        skew_ratio = mean_loss / median_loss
    else:
        skew_ratio = 1.0
    details["loss_mean_median_ratio"] = round(float(skew_ratio), 3)
    skew_score = clamp((skew_ratio - 1) * 80 + 15, 0, 100)

    composite = 0.40 * hold_score + 0.35 * mag_score + 0.25 * skew_score
    details["sub_scores"] = {
        "holding_asymmetry": round(hold_score, 1),
        "magnitude_asymmetry": round(mag_score, 1),
        "loss_skew": round(skew_score, 1),
    }
    return round(clamp(composite), 1), details


# ──────────────────────────────────────────────────────────────────────────────
# Revenge Trading
# ──────────────────────────────────────────────────────────────────────────────

def detect_revenge_trading(df: pd.DataFrame) -> tuple[float, dict]:
    """Score 0-100 for revenge trading."""
    details: dict = {}

    if len(df) < 10:
        return 0.0, {"reason": "insufficient_data"}

    # 1. Post-loss aggression index (position size after loss vs after win)
    after_loss = df[df["after_loss"]]
    after_win = df[~df["after_loss"]]

    avg_size_after_loss = after_loss["notional"].mean() if len(after_loss) else 0
    avg_size_after_win = after_win["notional"].mean() if len(after_win) else 1

    if avg_size_after_win > 0:
        aggression_index = avg_size_after_loss / avg_size_after_win
    else:
        aggression_index = 1.0
    details["post_loss_aggression_index"] = round(float(aggression_index), 3)
    aggr_score = clamp((aggression_index - 1) * 80 + 20, 0, 100)

    # 2. Risk spike after 2+ loss streak
    streak_mask = df["streak_index"] <= -2
    if streak_mask.sum() > 3:
        streak_trades = df[streak_mask]
        normal_trades = df[~streak_mask & ~df["after_loss"]]
        avg_risk_streak = streak_trades["position_size_pct"].mean() if len(streak_trades) else 0
        avg_risk_normal = normal_trades["position_size_pct"].mean() if len(normal_trades) else 1
        if avg_risk_normal > 0:
            risk_spike = avg_risk_streak / avg_risk_normal
        else:
            risk_spike = 1.0
        details["risk_spike_during_streak"] = round(float(risk_spike), 3)
        spike_score = clamp((risk_spike - 1) * 70 + 20, 0, 100)
    else:
        spike_score = 0
        details["risk_spike_during_streak"] = None

    # 3. Reduced cooldown after loss
    if "time_since_last" in df.columns:
        cooldown_after_loss = after_loss["time_since_last"].mean() if len(after_loss) else 0
        cooldown_after_win = after_win["time_since_last"].mean() if len(after_win) else 1
        if cooldown_after_win > 0 and cooldown_after_loss > 0:
            cooldown_ratio = cooldown_after_loss / cooldown_after_win
            details["cooldown_ratio"] = round(float(cooldown_ratio), 3)
            cool_score = clamp((1 - cooldown_ratio) * 100 + 20, 0, 100)
        else:
            cool_score = 0
    else:
        cool_score = 0

    composite = 0.40 * aggr_score + 0.30 * spike_score + 0.30 * cool_score
    details["sub_scores"] = {
        "aggression_index": round(aggr_score, 1),
        "risk_spike": round(spike_score, 1),
        "cooldown_reduction": round(cool_score, 1),
    }
    return round(clamp(composite), 1), details
