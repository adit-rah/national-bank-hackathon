export interface UploadResponse {
  session_id: string;
  trade_count: number;
  message: string;
}

export interface BiasScore {
  score: number;
  band: 'disciplined' | 'elevated' | 'high_risk';
  details: Record<string, any>;
}

export interface Archetype {
  label: string;
  details: Record<string, any>;
  description?: string;
}

export interface EquityCurvePoint {
  timestamp: string;
  balance: number;
  drawdown: number;
}

export interface TradeFrequency {
  days: number[];
  hours: number[];
  counts: number[];
}

export interface HoldingTimeComparison {
  win_mean: number;
  win_median: number;
  loss_mean: number;
  loss_median: number;
  win_values: number[];
  loss_values: number[];
}

export interface PositionScatterPoint {
  position_size: number;
  pnl: number;
  is_win: boolean;
  asset: string;
}

export interface FeatureSummary {
  total_trades: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  avg_holding_win_sec: number;
  avg_holding_loss_sec: number;
  trades_per_hour: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  final_balance: number;
  total_pnl: number;
  duration_hours: number;
}

export interface BiasTimelinePoint {
  timestamp: string;
  window_start: string;
  window_end: string;
  trade_count: number;
  overtrading: number;
  loss_aversion: number;
  revenge_trading: number;
  anchoring: number;
  overconfidence: number;
  dominant_bias: string;
}

export interface AnalysisResult {
  session_id: string;
  trade_count: number;
  overtrading: BiasScore;
  loss_aversion: BiasScore;
  revenge_trading: BiasScore;
  anchoring: BiasScore;
  overconfidence: BiasScore;
  archetype: Archetype;
  feature_summary: FeatureSummary;
  bias_timeline: BiasTimelinePoint[];
  equity_curve: EquityCurvePoint[];
  trade_frequency: TradeFrequency;
  holding_time_comparison: HoldingTimeComparison;
  position_scatter: PositionScatterPoint[];
}

export interface CounterfactualParams {
  max_position_pct?: number | null;
  stop_loss_pct?: number | null;
  max_daily_trades?: number | null;
  cooldown_minutes?: number | null;
  max_loss_streak?: number | null;
  max_drawdown_trigger_pct?: number | null;
}

export interface CounterfactualResult {
  session_id: string;
  params: CounterfactualParams;
  original: Record<string, number>;
  simulated: Record<string, number>;
  improvement: Record<string, number>;
  summary: string;
  equity_curve_original: { timestamp: string; balance: number }[];
  equity_curve_simulated: { timestamp: string; balance: number }[];
  trades_original: number;
  trades_simulated: number;
  excluded_breakdown: Record<string, number>;
}

export interface CoachResult {
  session_id: string;
  provider: string;
  feedback: string;
  discipline_plan: string[];
  daily_checklist: string[];
  journaling_prompts: string[];
}
