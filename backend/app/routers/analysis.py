"""Analysis router – trigger full bias analysis and retrieve results."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
import json

from app.database import get_db
from app.models import AnalysisSession, BiasResult, Trade
from app.schemas import AnalysisResponse, BiasScoreOut, ArchetypeOut
from app.services.scoring import run_full_analysis

router = APIRouter()


async def _load_trades_df(db: AsyncSession, session_id: str) -> pd.DataFrame:
    """Load all trades for a session into a DataFrame."""
    result = await db.execute(
        select(Trade)
        .where(Trade.session_id == session_id)
        .order_by(Trade.timestamp)
    )
    trades = result.scalars().all()
    if not trades:
        raise HTTPException(status_code=404, detail="No trades found for this session")

    records = [
        {
            "timestamp": t.timestamp,
            "asset": t.asset,
            "side": t.side,
            "quantity": t.quantity,
            "entry_price": t.entry_price,
            "exit_price": t.exit_price,
            "profit_loss": t.profit_loss,
            "balance": t.balance,
        }
        for t in trades
    ]
    return pd.DataFrame(records)


@router.post("/analysis/{session_id}")
async def run_analysis(session_id: str, db: AsyncSession = Depends(get_db)):
    """Run full bias analysis on uploaded trades."""
    # Verify session exists
    sess_result = await db.execute(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    df = await _load_trades_df(db, session_id)
    results = run_full_analysis(df)

    # Persist bias results
    existing = await db.execute(
        select(BiasResult).where(BiasResult.session_id == session_id)
    )
    bias_result = existing.scalar_one_or_none()
    if bias_result:
        bias_result.overtrading_score = results["overtrading"]["score"]
        bias_result.overtrading_details = results["overtrading"]["details"]
        bias_result.loss_aversion_score = results["loss_aversion"]["score"]
        bias_result.loss_aversion_details = results["loss_aversion"]["details"]
        bias_result.revenge_trading_score = results["revenge_trading"]["score"]
        bias_result.revenge_trading_details = results["revenge_trading"]["details"]
        bias_result.anchoring_score = results["anchoring"]["score"]
        bias_result.anchoring_details = results["anchoring"]["details"]
        bias_result.archetype = results["archetype"]["label"]
        bias_result.archetype_details = results["archetype"]["details"]
        bias_result.feature_summary = results["feature_summary"]
    else:
        bias_result = BiasResult(
            session_id=session_id,
            overtrading_score=results["overtrading"]["score"],
            overtrading_details=results["overtrading"]["details"],
            loss_aversion_score=results["loss_aversion"]["score"],
            loss_aversion_details=results["loss_aversion"]["details"],
            revenge_trading_score=results["revenge_trading"]["score"],
            revenge_trading_details=results["revenge_trading"]["details"],
            anchoring_score=results["anchoring"]["score"],
            anchoring_details=results["anchoring"]["details"],
            archetype=results["archetype"]["label"],
            archetype_details=results["archetype"]["details"],
            feature_summary=results["feature_summary"],
        )
        db.add(bias_result)

    await db.commit()

    return {
        "session_id": session_id,
        "trade_count": len(df),
        "overtrading": results["overtrading"],
        "loss_aversion": results["loss_aversion"],
        "revenge_trading": results["revenge_trading"],
        "anchoring": results["anchoring"],
        "archetype": results["archetype"],
        "feature_summary": results["feature_summary"],
        "equity_curve": results["equity_curve"],
        "trade_frequency": results["trade_frequency"],
        "holding_time_comparison": results["holding_time_comparison"],
        "position_scatter": results["position_scatter"],
    }


@router.get("/analysis/{session_id}")
async def get_analysis(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get cached analysis results (without re-running)."""
    result = await db.execute(
        select(BiasResult).where(BiasResult.session_id == session_id)
    )
    bias = result.scalar_one_or_none()
    if not bias:
        raise HTTPException(status_code=404, detail="Analysis not found. Run POST /api/analysis/{session_id} first.")

    return {
        "session_id": session_id,
        "overtrading": {
            "score": bias.overtrading_score,
            "band": _band(bias.overtrading_score),
            "details": bias.overtrading_details,
        },
        "loss_aversion": {
            "score": bias.loss_aversion_score,
            "band": _band(bias.loss_aversion_score),
            "details": bias.loss_aversion_details,
        },
        "revenge_trading": {
            "score": bias.revenge_trading_score,
            "band": _band(bias.revenge_trading_score),
            "details": bias.revenge_trading_details,
        },
        "anchoring": {
            "score": bias.anchoring_score,
            "band": _band(bias.anchoring_score),
            "details": bias.anchoring_details,
        },
        "archetype": {
            "label": bias.archetype,
            "details": bias.archetype_details,
        },
        "feature_summary": bias.feature_summary,
        "coach_output": bias.coach_output,
    }


@router.get("/sessions")
async def list_sessions(db: AsyncSession = Depends(get_db)):
    """List all analysis sessions."""
    result = await db.execute(
        select(AnalysisSession).order_by(AnalysisSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "filename": s.filename,
            "trade_count": s.trade_count,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]


def _band(score: float) -> str:
    if score < 30:
        return "disciplined"
    elif score < 60:
        return "elevated"
    return "high_risk"
