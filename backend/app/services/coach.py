"""AI Trading Coach – dual-provider (OpenAI + Anthropic) LLM integration."""

import json
from typing import Optional

from app.config import settings

SYSTEM_PROMPT = """You are an expert trading psychologist and behavioural finance coach.
You receive quantified bias analysis data from a trader's real performance.
Your job is to provide actionable, empathetic, and specific coaching.

RULES:
- Always reference the actual numbers provided (scores, ratios, percentages).
- Be specific — never say generic things like "be more disciplined."
- Structure your response as JSON with these keys:
  {
    "feedback": "2-3 paragraph personalised psychological analysis",
    "discipline_plan": ["step 1", "step 2", ...],
    "daily_checklist": ["item 1", "item 2", ...],
    "journaling_prompts": ["prompt 1", "prompt 2", ...]
  }
- Return ONLY valid JSON, no markdown fences.
"""


def _build_user_prompt(analysis: dict) -> str:
    """Build the user prompt from analysis results."""
    ot = analysis.get("overtrading", {})
    la = analysis.get("loss_aversion", {})
    rt = analysis.get("revenge_trading", {})
    arch = analysis.get("archetype", {})
    summary = analysis.get("feature_summary", {})

    return f"""Here is the trader's analysis:

## Performance Summary
- Total trades: {summary.get('total_trades', 'N/A')}
- Win rate: {summary.get('win_rate', 'N/A')}%
- Average win: ${summary.get('avg_win', 'N/A')}
- Average loss: ${summary.get('avg_loss', 'N/A')}
- Sharpe ratio: {summary.get('sharpe_ratio', 'N/A')}
- Max drawdown: {summary.get('max_drawdown_pct', 'N/A')}%
- Trades per hour: {summary.get('trades_per_hour', 'N/A')}

## Bias Scores (0-100, higher = worse)
- Overtrading: {ot.get('score', 'N/A')}/100 ({ot.get('band', 'N/A')})
  Details: {json.dumps(ot.get('details', {}), default=str)}
- Loss Aversion: {la.get('score', 'N/A')}/100 ({la.get('band', 'N/A')})
  Details: {json.dumps(la.get('details', {}), default=str)}
- Revenge Trading: {rt.get('score', 'N/A')}/100 ({rt.get('band', 'N/A')})
  Details: {json.dumps(rt.get('details', {}), default=str)}

## Trader Archetype
{arch.get('label', 'Unknown')}: {arch.get('details', {}).get('description', '')}

Provide your coaching response as JSON.
"""


async def generate_coaching(
    analysis: dict,
    provider_override: Optional[str] = None,
) -> dict:
    """Generate AI coaching based on analysis results."""
    provider = provider_override or settings.LLM_PROVIDER
    user_prompt = _build_user_prompt(analysis)

    if provider == "anthropic":
        return await _call_anthropic(user_prompt)
    else:
        return await _call_openai(user_prompt)


async def _call_openai(user_prompt: str) -> dict:
    """Call OpenAI API."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    try:
        return {"provider": "openai", **json.loads(content)}
    except json.JSONDecodeError:
        return {
            "provider": "openai",
            "feedback": content,
            "discipline_plan": [],
            "daily_checklist": [],
            "journaling_prompts": [],
        }


async def _call_anthropic(user_prompt: str) -> dict:
    """Call Anthropic API."""
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    content = response.content[0].text
    try:
        return {"provider": "anthropic", **json.loads(content)}
    except json.JSONDecodeError:
        return {
            "provider": "anthropic",
            "feedback": content,
            "discipline_plan": [],
            "daily_checklist": [],
            "journaling_prompts": [],
        }
