"""AI Trading Coach – multi-provider (OpenAI + Anthropic + Gemini + Groq) LLM integration."""

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


def _generate_fallback(analysis: dict) -> dict:
    """Template-based coaching when LLM is unavailable."""
    ot = analysis.get("overtrading", {})
    la = analysis.get("loss_aversion", {})
    rt = analysis.get("revenge_trading", {})
    arch = analysis.get("archetype", {})
    summary = analysis.get("feature_summary", {})

    # Find the worst bias
    biases = [
        ("Overtrading", ot.get("score", 0), ot.get("details", {})),
        ("Loss Aversion", la.get("score", 0), la.get("details", {})),
        ("Revenge Trading", rt.get("score", 0), rt.get("details", {})),
    ]
    biases.sort(key=lambda x: x[1], reverse=True)
    worst_name, worst_score, worst_details = biases[0]

    win_rate = summary.get("win_rate", 0)
    avg_win = summary.get("avg_win", 0)
    avg_loss = summary.get("avg_loss", 0)
    trades_per_hour = summary.get("trades_per_hour", 0)
    sharpe = summary.get("sharpe_ratio", 0)

    feedback_parts = [
        f"Based on {summary.get('total_trades', 0)} trades analyzed, your most significant bias is {worst_name} with a severity score of {worst_score}/100.",
    ]

    if worst_name == "Overtrading":
        feedback_parts.append(
            f"You're averaging {trades_per_hour:.1f} trades per hour. "
            f"Post-loss cooldown ratio is {worst_details.get('post_loss_cooldown_ratio', 'N/A')}, "
            f"suggesting you trade faster after losses. This impulsive pattern erodes edge."
        )
    elif worst_name == "Loss Aversion":
        ratio = worst_details.get("holding_ratio_loss_to_win", 1)
        mag = worst_details.get("loss_win_magnitude_ratio", 1)
        feedback_parts.append(
            f"You hold losses {ratio:.1f}x longer than wins, and your average loss is {mag:.1f}x "
            f"your average win (${abs(avg_loss):.2f} vs ${avg_win:.2f}). This asymmetry is the "
            f"hallmark of loss aversion — the reluctance to realize losses."
        )
    else:
        agg = worst_details.get("post_loss_aggression_index", 1)
        feedback_parts.append(
            f"Your post-loss aggression index is {agg:.2f} — meaning you increase position sizes "
            f"after losses. Combined with a win rate of {win_rate:.1f}% and Sharpe of {sharpe:.2f}, "
            f"this revenge pattern compounds drawdowns."
        )

    feedback_parts.append(
        f"Your trader archetype is '{arch.get('label', 'Unknown')}'. "
        f"Tailoring your discipline plan to this profile will yield the best results."
    )

    discipline_plan = []
    if ot.get("score", 0) >= 30:
        discipline_plan.append(f"Limit yourself to a maximum of {max(int(trades_per_hour * 0.6), 3)} trades per hour to reduce impulsive entries.")
    if la.get("score", 0) >= 30:
        discipline_plan.append("Set a hard stop-loss at 2% of account balance on every trade — no exceptions.")
        discipline_plan.append("Use a timer: if a losing trade has been open 50% longer than your average win hold time, review and close.")
    if rt.get("score", 0) >= 30:
        discipline_plan.append("After any loss, enforce a mandatory 10-minute cooldown before your next trade.")
        discipline_plan.append("Never increase position size on the trade immediately following a loss.")
    discipline_plan.append("Review your trading journal at end of day and score yourself on plan adherence.")

    checklist = [
        "Review overnight positions and set alerts before market open",
        "Write down your maximum loss limit for the day",
        "Take a 5-minute break after every 3 consecutive trades",
        "Log the emotional state (1-10 calm scale) before each trade",
        "End-of-day review: did I follow my discipline plan?",
    ]

    prompts = [
        f"My biggest trading bias is {worst_name} ({worst_score}/100). What triggered it today?",
        "Describe a trade today where I followed my plan perfectly. How did it feel?",
        "What would a disciplined version of me do differently tomorrow?",
        f"My win rate is {win_rate:.1f}%. Am I focusing on quality setups or chasing quantity?",
    ]

    return {
        "provider": "fallback",
        "feedback": "\n\n".join(feedback_parts),
        "discipline_plan": discipline_plan,
        "daily_checklist": checklist,
        "journaling_prompts": prompts,
    }


def _has_valid_key(key: str) -> bool:
    """Check if an API key looks real (not a placeholder)."""
    return bool(key) and len(key) >= 10 and "your" not in key.lower()


def _pick_provider(preferred: str) -> str | None:
    """Pick a provider with a valid key, preferring the requested one.

    Returns the provider name or None if no valid key is found.
    """
    provider_keys = {
        "openai": settings.OPENAI_API_KEY,
        "anthropic": settings.ANTHROPIC_API_KEY,
        "gemini": settings.GEMINI_API_KEY,
        "groq": settings.GROQ_API_KEY,
    }

    # Try preferred first
    if _has_valid_key(provider_keys.get(preferred, "")):
        return preferred

    # Try others in order
    for name, key in provider_keys.items():
        if name != preferred and _has_valid_key(key):
            return name

    return None


async def generate_coaching(
    analysis: dict,
    provider_override: Optional[str] = None,
) -> dict:
    """Generate AI coaching based on analysis results.

    Falls back to template-based coaching if no API key is configured
    or the LLM call fails.
    """
    preferred = provider_override or settings.LLM_PROVIDER
    provider = _pick_provider(preferred)

    if provider is None:
        return _generate_fallback(analysis)

    user_prompt = _build_user_prompt(analysis)

    try:
        if provider == "anthropic":
            return await _call_anthropic(user_prompt)
        elif provider == "gemini":
            return await _call_gemini(user_prompt)
        elif provider == "groq":
            return await _call_groq(user_prompt)
        else:
            return await _call_openai(user_prompt)
    except Exception as e:
        # LLM failed — gracefully degrade to template
        import logging
        logging.getLogger(__name__).warning("LLM call failed, using template fallback: %s", e)
        return _generate_fallback(analysis)


async def _call_groq(user_prompt: str) -> dict:
    """Call Groq API (Llama models)."""
    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
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
        return {"provider": "groq", **json.loads(content)}
    except json.JSONDecodeError:
        return {
            "provider": "groq",
            "feedback": content,
            "discipline_plan": [],
            "daily_checklist": [],
            "journaling_prompts": [],
        }


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


async def _call_gemini(user_prompt: str) -> dict:
    """Call Google Gemini API."""
    from google import genai

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=f"{SYSTEM_PROMPT}\n\n{user_prompt}",
        config={
            "response_mime_type": "application/json",
            "temperature": 0.7,
            "max_output_tokens": 2000,
        },
    )
    content = response.text
    try:
        return {"provider": "gemini", **json.loads(content)}
    except json.JSONDecodeError:
        return {
            "provider": "gemini",
            "feedback": content,
            "discipline_plan": [],
            "daily_checklist": [],
            "journaling_prompts": [],
        }
