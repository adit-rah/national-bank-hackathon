"""Counterfactual simulation router."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd

from app.database import get_db
from app.models import AnalysisSession, Trade
from app.schemas import CounterfactualRequest, CounterfactualResponse
from app.services.features import compute_trade_features
from app.services.counterfactual import simulate

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/counterfactual/{session_id}", response_model=CounterfactualResponse)
async def run_counterfactual(
    session_id: str,
    params: CounterfactualRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run a counterfactual simulation on a session's trades."""
    logger.info("Counterfactual request | session=%s params=%s", session_id, params.model_dump())

    # Verify session
    sess_result = await db.execute(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    if not sess_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    # Load trades
    result = await db.execute(
        select(Trade)
        .where(Trade.session_id == session_id)
        .order_by(Trade.timestamp)
    )
    trades = result.scalars().all()
    if not trades:
        raise HTTPException(status_code=404, detail="No trades found")

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
    df = pd.DataFrame(records)
    df = compute_trade_features(df)
    logger.info("Loaded %d trades for session %s", len(df), session_id)

    sim_result = simulate(
        df,
        max_position_pct=params.max_position_pct,
        stop_loss_pct=params.stop_loss_pct,
        max_daily_trades=params.max_daily_trades,
        cooldown_minutes=params.cooldown_minutes,
    )

    return {
        "session_id": session_id,
        "params": params.model_dump(),
        **sim_result,
    }
