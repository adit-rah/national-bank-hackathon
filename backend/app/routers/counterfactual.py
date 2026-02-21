"""Counterfactual simulation router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AnalysisSession, Trade
from app.schemas import CounterfactualRequest
from app.services.features import compute_trade_features
from app.services.counterfactual import simulate
import pandas as pd

router = APIRouter()


@router.post("/counterfactual/{session_id}")
async def run_counterfactual(
    session_id: str,
    params: CounterfactualRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run a counterfactual simulation on a session's trades."""
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
