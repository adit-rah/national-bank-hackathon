"""AI Trading Coach router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import BiasResult
from app.schemas import CoachRequest
from app.services.coach import generate_coaching

router = APIRouter()


@router.post("/coach/{session_id}")
async def get_coaching(
    session_id: str,
    body: CoachRequest = CoachRequest(),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI coaching based on analysis results."""
    # Load bias results
    result = await db.execute(
        select(BiasResult).where(BiasResult.session_id == session_id)
    )
    bias = result.scalar_one_or_none()
    if not bias:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found. Run POST /api/analysis/{session_id} first.",
        )

    analysis = {
        "overtrading": {
            "score": bias.overtrading_score,
            "band": _band(bias.overtrading_score),
            "details": bias.overtrading_details or {},
        },
        "loss_aversion": {
            "score": bias.loss_aversion_score,
            "band": _band(bias.loss_aversion_score),
            "details": bias.loss_aversion_details or {},
        },
        "revenge_trading": {
            "score": bias.revenge_trading_score,
            "band": _band(bias.revenge_trading_score),
            "details": bias.revenge_trading_details or {},
        },
        "anchoring": {
            "score": bias.anchoring_score,
            "band": _band(bias.anchoring_score),
            "details": bias.anchoring_details or {},
        },
        "archetype": {
            "label": bias.archetype,
            "details": bias.archetype_details or {},
        },
        "feature_summary": bias.feature_summary or {},
    }

    coaching = await generate_coaching(analysis, provider_override=body.provider)

    # Cache coaching output
    bias.coach_output = coaching
    await db.commit()

    return {
        "session_id": session_id,
        **coaching,
    }


def _band(score: float) -> str:
    if score < 30:
        return "disciplined"
    elif score < 60:
        return "elevated"
    return "high_risk"
