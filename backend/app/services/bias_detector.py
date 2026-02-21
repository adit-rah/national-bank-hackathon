"""Bias detection engine — overtrading, loss aversion, revenge trading.

Each bias is scored 0–100 (continuous) with supporting detail dicts.
Scoring uses sigmoid-based transforms for smooth 0–100 mapping with
clear differentiation between healthy and problematic behaviour.
"""

import numpy as np
import pandas as pd
from scipy import stats

from app.utils import clamp


def _sigmoid(x: float, midpoint: float = 0.0, steepness: float = 1.0) -> float:
    """Logistic sigmoid mapped to 0–100.

    midpoint: value of x where output = 50
    steepness: how fast the curve transitions (higher = sharper)
    """
    return float(100 / (1 + np.exp(-steepness * (x - midpoint))))


# ──────────────────────────────────────────────────────────────────────────────
# Overtrading
# ──────────────────────────────────────────────────────────────────────────────

def detect_overtrading(df: pd.DataFrame) -> tuple[float, dict]:
    """Score 0-100 for overtrading tendency.

    Key signals:
    - Raw trade frequency (trades per hour)
    - Post-loss frequency acceleration
    - Trade clustering density
    - Correlation between losing streaks and trade speed
    """
    details: dict = {}

    duration_hours = (df["timestamp"].max() - df["timestamp"].min()).total_seconds() / 3600
    if duration_hours <= 0:
        return 0.0, {"reason": "insufficient_data"}

    trades_per_hour = len(df) / duration_hours
    details["trades_per_hour"] = round(trades_per_hour, 2)

    # ── 1. Frequency score (sigmoid: 60/hr → ~20, 120/hr → ~50, 360/hr → ~90) ──
    freq_score = _sigmoid(trades_per_hour, midpoint=120, steepness=0.02)
    details["frequency_score_raw"] = round(freq_score, 1)

    # ── 2. Post-loss frequency acceleration ──
    if "after_loss" in df.columns and "time_since_last" in df.columns:
        post_loss_times = df[df["after_loss"]]["time_since_last"]
        normal_times = df[~df["after_loss"]]["time_since_last"]

        if len(post_loss_times) > 5 and len(normal_times) > 5:
            post_loss_mean = post_loss_times.mean()
            normal_mean = normal_times.mean()

            if normal_mean > 0 and post_loss_mean > 0:
                # Ratio < 1 = trading faster after losses (overtrading signal)
                cooldown_ratio = post_loss_mean / normal_mean
                # sigmoid centered at 1.0 (neutral), inverted: lower ratio = higher score
                accel_score = _sigmoid(1 - cooldown_ratio, midpoint=0.05, steepness=30)
                details["post_loss_cooldown_ratio"] = round(cooldown_ratio, 4)
            else:
                accel_score = 0
        else:
            accel_score = 0
    else:
        accel_score = 0

    # ── 3. Trade clustering density ──
    if "trades_1h" in df.columns:
        cluster_density = df["trades_1h"].mean()
        # sigmoid: density of 30 → ~20, 60 → ~50, 200+ → ~90
        cluster_score = _sigmoid(cluster_density, midpoint=60, steepness=0.03)
        details["avg_cluster_density_1h"] = round(float(cluster_density), 2)
    else:
        cluster_score = 0

    # ── 4. Loss-streak / frequency correlation ──
    if "streak_index" in df.columns and "trades_1h" in df.columns:
        loss_mask = df["streak_index"] < 0
        if loss_mask.sum() > 10:
            corr, p_val = stats.pearsonr(
                df.loc[loss_mask, "streak_index"].abs(),
                df.loc[loss_mask, "trades_1h"],
            )
            details["loss_streak_freq_corr"] = round(float(corr), 4)
            details["loss_streak_freq_pval"] = round(float(p_val), 6)
            # Only count positive correlation as overtrading signal
            corr_score = _sigmoid(max(float(corr), 0), midpoint=0.15, steepness=15) if p_val < 0.1 else 0
        else:
            corr_score = 0
    else:
        corr_score = 0

    composite = 0.40 * freq_score + 0.25 * accel_score + 0.20 * cluster_score + 0.15 * corr_score
    details["sub_scores"] = {
        "frequency": round(freq_score, 1),
        "post_loss_acceleration": round(accel_score, 1),
        "cluster_density": round(cluster_score, 1),
        "loss_streak_correlation": round(corr_score, 1),
    }
    return round(clamp(composite), 1), details


# ──────────────────────────────────────────────────────────────────────────────
# Loss Aversion
# ──────────────────────────────────────────────────────────────────────────────

def detect_loss_aversion(df: pd.DataFrame) -> tuple[float, dict]:
    """Score 0-100 for loss aversion.

    Key signals:
    - Loss / win magnitude ratio (are losses much bigger than wins?)
    - Holding time asymmetry (are losses held longer?)
    - Loss distribution skew (are there outlier catastrophic losses?)
    - Win rate paradox (high win rate but negative expectancy = classic aversion)
    """
    details: dict = {}
    wins = df[df["is_win"]]
    losses = df[~df["is_win"]]

    if len(wins) < 5 or len(losses) < 5:
        return 0.0, {"reason": "insufficient_data"}

    # ── 1. Loss/win magnitude ratio (primary signal) ──
    avg_loss_size = abs(losses["profit_loss"].mean())
    avg_win_size = abs(wins["profit_loss"].mean())

    if avg_win_size > 0:
        magnitude_ratio = avg_loss_size / avg_win_size
    else:
        magnitude_ratio = 1.0

    details["loss_win_magnitude_ratio"] = round(float(magnitude_ratio), 3)
    details["avg_loss"] = round(float(avg_loss_size), 2)
    details["avg_win"] = round(float(avg_win_size), 2)

    # Use log-scale sigmoid: ratio 1.0 → ~5, ratio 2.0 → ~50, ratio 10+ → ~90+
    log_ratio = np.log1p(max(magnitude_ratio - 1, 0))
    mag_score = _sigmoid(log_ratio, midpoint=0.7, steepness=4)

    # ── 2. Holding time asymmetry ──
    avg_hold_win = wins["holding_duration"].mean() if "holding_duration" in wins.columns else 0
    avg_hold_loss = losses["holding_duration"].mean() if "holding_duration" in losses.columns else 0

    if avg_hold_win > 0:
        hold_ratio = avg_hold_loss / avg_hold_win
    else:
        hold_ratio = 1.0

    details["holding_ratio_loss_to_win"] = round(float(hold_ratio), 3)
    # Ratio 1.0 → ~5, 1.5 → ~50, 3.0+ → ~90
    hold_score = _sigmoid(hold_ratio - 1, midpoint=0.5, steepness=4)

    # t-test on holding times
    if avg_hold_win > 0 and avg_hold_loss > 0:
        t_stat, p_val = stats.ttest_ind(
            losses["holding_duration"].dropna(),
            wins["holding_duration"].dropna(),
            equal_var=False,
        )
        details["holding_ttest_t"] = round(float(t_stat), 4)
        details["holding_ttest_p"] = round(float(p_val), 6)
        details["holding_significant"] = bool(p_val < 0.05)
    else:
        details["holding_significant"] = False

    # ── 3. Loss distribution skew (fat tail = letting losses run) ──
    median_loss = abs(losses["profit_loss"].median())
    if median_loss > 0:
        skew_ratio = avg_loss_size / median_loss
    else:
        skew_ratio = 1.0

    details["loss_mean_median_ratio"] = round(float(skew_ratio), 3)
    # Ratio 1.0 → ~5, 2.0 → ~50, 5+ → ~90
    skew_score = _sigmoid(skew_ratio - 1, midpoint=1.0, steepness=2.5)

    # ── 4. Win rate paradox (high win rate + poor risk/reward = aversion) ──
    win_rate = len(wins) / len(df)
    expectancy = df["profit_loss"].mean()
    # If win rate is high but expectancy is low/negative, strong aversion signal
    if win_rate > 0.55 and magnitude_ratio > 1.5:
        paradox_score = _sigmoid(win_rate * magnitude_ratio, midpoint=1.5, steepness=2)
    else:
        paradox_score = 0
    details["win_rate"] = round(float(win_rate * 100), 1)
    details["expectancy"] = round(float(expectancy), 2)

    # Weighted composite — magnitude ratio dominates since it's the strongest signal
    composite = 0.45 * mag_score + 0.20 * hold_score + 0.15 * skew_score + 0.20 * paradox_score
    details["sub_scores"] = {
        "magnitude_asymmetry": round(mag_score, 1),
        "holding_asymmetry": round(hold_score, 1),
        "loss_skew": round(skew_score, 1),
        "win_rate_paradox": round(paradox_score, 1),
    }
    return round(clamp(composite), 1), details


# ──────────────────────────────────────────────────────────────────────────────
# Revenge Trading
# ──────────────────────────────────────────────────────────────────────────────

def detect_revenge_trading(df: pd.DataFrame) -> tuple[float, dict]:
    """Score 0-100 for revenge trading.

    Revenge trading is about *worse decision-making after losses* — not just
    bigger positions.  Key signals:
    - Performance deterioration after losses (avg PnL drops)
    - Sharpe ratio collapse after losses vs after wins
    - Loss escalation during streaks (losses get bigger)
    - PnL volatility increase after losses (erratic outcomes)
    - Position size aggression after losses
    """
    details: dict = {}

    if len(df) < 10:
        return 0.0, {"reason": "insufficient_data"}

    after_loss = df[df["after_loss"]]
    after_win = df[~df["after_loss"]]

    if len(after_loss) < 5 or len(after_win) < 5:
        return 0.0, {"reason": "insufficient_post_loss_data"}

    # ── 1. Post-loss performance deterioration ──
    # (Does the trader perform significantly WORSE after a loss?)
    avg_pnl_after_loss = after_loss["profit_loss"].mean()
    avg_pnl_after_win = after_win["profit_loss"].mean()

    pnl_spread = avg_pnl_after_win - avg_pnl_after_loss
    pnl_scale = df["profit_loss"].std() if df["profit_loss"].std() > 0 else 1
    pnl_deterioration = pnl_spread / pnl_scale

    details["avg_pnl_after_loss"] = round(float(avg_pnl_after_loss), 2)
    details["avg_pnl_after_win"] = round(float(avg_pnl_after_win), 2)
    details["pnl_deterioration"] = round(float(pnl_deterioration), 4)

    # Use a t-test to check if the deterioration is statistically significant
    t_stat, p_val = stats.ttest_ind(
        after_loss["profit_loss"].values,
        after_win["profit_loss"].values,
        equal_var=False,
    )
    p_val = p_val if not np.isnan(p_val) else 1.0
    details["deterioration_pval"] = round(float(p_val), 6)

    # Only score if p < 0.2 AND spread is in the right direction (worse after loss)
    if pnl_deterioration > 0 and p_val < 0.2:
        deterioration_score = _sigmoid(pnl_deterioration, midpoint=0.04, steepness=60)
    else:
        deterioration_score = _sigmoid(max(pnl_deterioration, 0), midpoint=0.08, steepness=40)

    # ── 2. Negative post-loss expectancy ──
    # (Does the trader consistently LOSE money after losses?
    #  A strongly negative avg PnL after loss = emotional decisions.)
    avg_loss_pct = avg_pnl_after_loss / pnl_scale if pnl_scale > 0 else 0
    details["post_loss_expectancy_norm"] = round(float(avg_loss_pct), 4)
    # sigmoid: 0 → ~5, -0.02 → ~30, -0.04+ → ~70
    expectancy_score = _sigmoid(-avg_loss_pct, midpoint=0.02, steepness=80) if avg_pnl_after_loss < 0 else 0

    # ── 3. Loss escalation during streaks ──
    streak_mask = df["streak_index"] <= -2
    if streak_mask.sum() > 3:
        first_loss_avg = df[df["streak_index"] == -1]["profit_loss"].abs().mean()
        second_loss_avg = df[df["streak_index"] == -2]["profit_loss"].abs().mean()
        deep_loss_avg = df[df["streak_index"] <= -3]["profit_loss"].abs().mean() if (df["streak_index"] <= -3).sum() > 3 else second_loss_avg

        if first_loss_avg > 0:
            escalation = second_loss_avg / first_loss_avg
        else:
            escalation = 1.0

        details["loss_escalation_ratio"] = round(float(escalation), 3)
        details["first_loss_avg"] = round(float(first_loss_avg), 2)
        details["second_loss_avg"] = round(float(second_loss_avg), 2)
        # sigmoid: 1.0 → ~5, 1.04 → ~50, 1.10+ → ~85
        escalation_score = _sigmoid(escalation - 1, midpoint=0.04, steepness=60)
    else:
        escalation_score = 0
        details["loss_escalation_ratio"] = None

    # ── 4. PnL volatility increase after losses ──
    pnl_vol_after_loss = after_loss["profit_loss"].std()
    pnl_vol_after_win = after_win["profit_loss"].std()
    if pnl_vol_after_win > 0:
        vol_ratio = pnl_vol_after_loss / pnl_vol_after_win
    else:
        vol_ratio = 1.0

    details["pnl_volatility_ratio"] = round(float(vol_ratio), 3)
    # sigmoid: 1.0 → ~5, 1.02 → ~50, 1.06+ → ~85
    vol_score = _sigmoid(vol_ratio - 1, midpoint=0.02, steepness=100)

    # ── 5. Position size aggression after losses (original signal, kept) ──
    avg_size_after_loss = after_loss["notional"].abs().mean() if len(after_loss) else 0
    avg_size_after_win = after_win["notional"].abs().mean() if len(after_win) else 1

    if avg_size_after_win > 0:
        aggression_index = avg_size_after_loss / avg_size_after_win
    else:
        aggression_index = 1.0

    details["post_loss_aggression_index"] = round(float(aggression_index), 3)
    aggr_score = _sigmoid(aggression_index - 1, midpoint=0.15, steepness=20)

    composite = (
        0.20 * deterioration_score
        + 0.20 * expectancy_score
        + 0.25 * escalation_score
        + 0.20 * vol_score
        + 0.15 * aggr_score
    )
    details["sub_scores"] = {
        "performance_deterioration": round(deterioration_score, 1),
        "negative_expectancy": round(expectancy_score, 1),
        "loss_escalation": round(escalation_score, 1),
        "volatility_increase": round(vol_score, 1),
        "aggression_index": round(aggr_score, 1),
    }
    return round(clamp(composite), 1), details


# ──────────────────────────────────────────────────────────────────────────────
# Anchoring Bias
# ──────────────────────────────────────────────────────────────────────────────

def detect_anchoring(df: pd.DataFrame) -> tuple[float, dict]:
    """Score 0-100 for anchoring bias.

    Anchoring occurs when traders fixate on reference points (entry price,
    recent high/low) and make irrational decisions based on these anchors.
    """
    details: dict = {}

    if len(df) < 10:
        return 0.0, {"reason": "insufficient_data"}

    # 1. Exit price proximity to entry (reluctance to exit near entry = anchoring)
    df_copy = df.copy()
    df_copy["exit_entry_ratio"] = abs(df_copy["exit_price"] / df_copy["entry_price"] - 1)

    # Count trades exited within 1% of entry price
    anchored_exits = (df_copy["exit_entry_ratio"] < 0.01).sum()
    anchor_rate = anchored_exits / len(df_copy) * 100
    details["anchor_exit_rate_pct"] = round(float(anchor_rate), 2)

    anchor_score = clamp(anchor_rate * 5, 0, 100)  # 20%+ anchored exits = high score

    # 2. Profit/loss clustering around zero (reluctance to take small losses/gains)
    pnl_median = abs(df["profit_loss"]).median()
    if pnl_median > 0:
        pnl_near_zero = (abs(df["profit_loss"]) < pnl_median * 0.1).sum()
        zero_cluster_rate = pnl_near_zero / len(df) * 100
        details["pnl_near_zero_pct"] = round(float(zero_cluster_rate), 2)
        cluster_score = clamp(zero_cluster_rate * 3, 0, 100)
    else:
        details["pnl_near_zero_pct"] = 0.0
        cluster_score = 0

    # 3. Round number fixation (exits at prices ending in .00, .50, etc.)
    if "exit_price" in df.columns:
        exit_decimals = df["exit_price"].apply(lambda x: abs(x - round(x, 0)))
        round_number_exits = (exit_decimals < 0.01).sum()
        round_number_rate = round_number_exits / len(df) * 100
        details["round_number_exit_rate_pct"] = round(float(round_number_rate), 2)
        round_score = clamp(round_number_rate * 2, 0, 100)
    else:
        round_score = 0

    composite = 0.40 * anchor_score + 0.35 * cluster_score + 0.25 * round_score
    details["sub_scores"] = {
        "anchor_exit": round(anchor_score, 1),
        "zero_clustering": round(cluster_score, 1),
        "round_number": round(round_score, 1),
    }
    return round(clamp(composite), 1), details
