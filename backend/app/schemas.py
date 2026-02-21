from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── Upload ───
class TradeManualEntry(BaseModel):
    timestamp: str
    asset: str
    side: str
    quantity: float
    entry_price: float
    exit_price: float
    profit_loss: float
    balance: float


class UploadResponse(BaseModel):
    session_id: str
    trade_count: int
    message: str


# ─── Analysis ───
class BiasScoreOut(BaseModel):
    score: float
    band: str  # disciplined / elevated / high_risk
    details: Optional[dict] = None


class ArchetypeOut(BaseModel):
    label: str
    description: str
    details: Optional[dict] = None


class AnalysisResponse(BaseModel):
    session_id: str
    trade_count: int
    overtrading: BiasScoreOut
    loss_aversion: BiasScoreOut
    revenge_trading: BiasScoreOut
    archetype: ArchetypeOut
    feature_summary: dict
    equity_curve: List[dict]
    trade_frequency: dict
    holding_time_comparison: dict
    position_scatter: List[dict]


# ─── Counterfactual ───
class CounterfactualRequest(BaseModel):
    max_position_pct: Optional[float] = None  # e.g. 5.0 means 5%
    stop_loss_pct: Optional[float] = None      # e.g. 2.0 means 2%
    max_daily_trades: Optional[int] = None
    cooldown_minutes: Optional[float] = None


class MetricsComparison(BaseModel):
    original: dict
    simulated: dict
    improvement: dict
    summary: str


class CounterfactualResponse(BaseModel):
    session_id: str
    params: dict
    metrics: MetricsComparison
    equity_curve_original: List[dict]
    equity_curve_simulated: List[dict]


# ─── Coach ───
class CoachRequest(BaseModel):
    provider: Optional[str] = None  # override LLM_PROVIDER: openai, anthropic, gemini, groq


class CoachResponse(BaseModel):
    session_id: str
    provider: str
    feedback: str
    discipline_plan: List[str]
    daily_checklist: List[str]
    journaling_prompts: List[str]
