"""AI logic: food/supplement vision, coaching chat, and daily plans.

Every function uses OpenAI when an API key is configured and otherwise returns a
deterministic heuristic result, so the backend is always usable in development.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from .config import get_settings
from .schemas import (
    ChatMessageIn,
    CoachPlan,
    DailyPlanItem,
    FoodScanResult,
    Profile,
    SupplementResult,
)

GOAL_LABELS = {
    "lose_fat": "lose fat",
    "build_muscle": "build muscle",
    "recomp": "recomposition",
    "maintain": "maintain health",
    "endurance": "build endurance",
}

GOAL_SUPPLEMENTS = {
    "lose_fat": ["Whey protein", "Caffeine + L-theanine", "Vitamin D3", "Omega-3"],
    "build_muscle": ["Creatine 5g", "Whey protein", "Vitamin D3", "Magnesium"],
    "recomp": ["Creatine 5g", "Whey protein", "Omega-3"],
    "maintain": ["Vitamin D3", "Omega-3", "Magnesium"],
    "endurance": ["Omega-3", "Magnesium", "Vitamin D3", "Electrolytes"],
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _client():
    settings = get_settings()
    if not settings.has_openai:
        return None
    try:
        from openai import OpenAI

        return OpenAI(api_key=settings.openai_api_key)
    except Exception:
        return None


def _data_uri(image_b64: str) -> str:
    if image_b64.startswith("data:"):
        return image_b64
    return f"data:image/jpeg;base64,{image_b64}"


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        # remove possible leading "json"
        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start : end + 1]
    return json.loads(text)


# ---------------------------------------------------------------------------
# Food vision
# ---------------------------------------------------------------------------

FOOD_PROMPT_PLATE = (
    "You are a nutrition expert. Look at this plate of food and estimate its nutrition. "
    "Identify each distinct food item with an approximate portion, then give totals. "
    "Respond ONLY with JSON matching this schema: "
    '{"name": str, "items": [{"name": str, "portion": str, '
    '"nutrients": {"calories": num, "proteinG": num, "carbsG": num, "fatG": num, "fiberG": num}}], '
    '"total": {"calories": num, "proteinG": num, "carbsG": num, "fatG": num, "fiberG": num}, '
    '"confidence": num_0_to_1, "notes": str}. Be realistic and concise.'
)

FOOD_PROMPT_LABEL = (
    "You are reading a nutrition facts label. Extract the per-serving nutrition. "
    "Respond ONLY with JSON matching this schema: "
    '{"name": str, "items": [{"name": str, "portion": str, '
    '"nutrients": {"calories": num, "proteinG": num, "carbsG": num, "fatG": num, "fiberG": num, "sugarG": num, "sodiumMg": num}}], '
    '"total": {"calories": num, "proteinG": num, "carbsG": num, "fatG": num, "fiberG": num, "sugarG": num, "sodiumMg": num}, '
    '"confidence": num_0_to_1, "notes": str}.'
)


def analyze_food(image_b64: str, mode: str) -> FoodScanResult:
    client = _client()
    if client is None or not image_b64:
        return _food_fallback(mode)
    settings = get_settings()
    prompt = FOOD_PROMPT_LABEL if mode == "label" else FOOD_PROMPT_PLATE
    try:
        resp = client.chat.completions.create(
            model=settings.openai_vision_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": _data_uri(image_b64)}},
                    ],
                }
            ],
            max_tokens=700,
            temperature=0.2,
        )
        data = _extract_json(resp.choices[0].message.content or "")
        return FoodScanResult.model_validate(data)
    except Exception:
        return _food_fallback(mode)


def _food_fallback(mode: str) -> FoodScanResult:
    if mode == "label":
        return FoodScanResult(
            name="Scanned label",
            items=[
                {
                    "name": "Packaged food (per serving)",
                    "portion": "1 serving",
                    "nutrients": {"calories": 210, "proteinG": 8, "carbsG": 27, "fatG": 7, "fiberG": 3},
                }
            ],
            total={"calories": 210, "proteinG": 8, "carbsG": 27, "fatG": 7, "fiberG": 3},
            confidence=0.5,
            notes="Heuristic estimate — set OPENAI_API_KEY for real label OCR.",
        )
    return FoodScanResult(
        name="Balanced plate",
        items=[
            {"name": "Protein", "portion": "~150 g", "nutrients": {"calories": 240, "proteinG": 45, "carbsG": 0, "fatG": 6}},
            {"name": "Vegetables", "portion": "~120 g", "nutrients": {"calories": 70, "proteinG": 3, "carbsG": 12, "fatG": 1, "fiberG": 5}},
            {"name": "Carb", "portion": "~1 cup", "nutrients": {"calories": 205, "proteinG": 4, "carbsG": 45, "fatG": 1}},
        ],
        total={"calories": 515, "proteinG": 52, "carbsG": 57, "fatG": 8, "fiberG": 5},
        confidence=0.5,
        notes="Heuristic estimate — set OPENAI_API_KEY for real plate analysis.",
    )


# ---------------------------------------------------------------------------
# Supplement vision
# ---------------------------------------------------------------------------

SUPPLEMENT_PROMPT = (
    "You are a supplement expert. Read this supplement label and analyze it. "
    "Respond ONLY with JSON: "
    '{"name": str, "brand": str, "form": one_of[capsule|tablet|powder|liquid|gummy|softgel], '
    '"servingSize": str, "ingredients": [{"name": str, "amount": num, "unit": str, "dailyValuePct": num}], '
    '"purpose": str, "benefits": [str], "cautions": [str], "timing": str}. '
    "Be accurate and evidence-based; keep benefits/cautions short."
)


def analyze_supplement(image_b64: str) -> SupplementResult:
    client = _client()
    if client is None or not image_b64:
        return _supplement_fallback()
    settings = get_settings()
    try:
        resp = client.chat.completions.create(
            model=settings.openai_vision_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": SUPPLEMENT_PROMPT},
                        {"type": "image_url", "image_url": {"url": _data_uri(image_b64)}},
                    ],
                }
            ],
            max_tokens=700,
            temperature=0.2,
        )
        data = _extract_json(resp.choices[0].message.content or "")
        return SupplementResult.model_validate(data)
    except Exception:
        return _supplement_fallback()


def _supplement_fallback() -> SupplementResult:
    return SupplementResult(
        name="Creatine Monohydrate",
        form="powder",
        servingSize="5 g",
        ingredients=[{"name": "Creatine Monohydrate", "amount": 5, "unit": "g"}],
        purpose="Strength & power output",
        benefits=["Increases strength and lean mass", "Supports recovery"],
        cautions=["Stay hydrated"],
        timing="Any time daily; consistency matters most",
        goalFit=0.9,
    )


# ---------------------------------------------------------------------------
# Coaching chat
# ---------------------------------------------------------------------------


def _system_prompt(profile: Optional[Profile]) -> str:
    base = (
        "You are Apexia, a friendly, practical fitness and nutrition coach. "
        "Your user often has a hectic life (job, kids). Favor flexible, realistic advice over rigid routines. "
        "Be encouraging and concise. Never shame the user for missing a day. "
        "Give specific, actionable suggestions for meals, workouts, and supplements."
    )
    if not profile:
        return base
    parts = [base, "\nUser context:"]
    if profile.displayName:
        parts.append(f"- Name: {profile.displayName}")
    if profile.goal:
        parts.append(f"- Goal: {GOAL_LABELS.get(profile.goal, profile.goal)}")
    if profile.targets:
        parts.append(
            f"- Daily targets: {int(profile.targets.calories)} kcal, "
            f"{int(profile.targets.proteinG)}g protein, {int(profile.targets.carbsG)}g carbs, {int(profile.targets.fatG)}g fat"
        )
    if profile.lifestyle:
        parts.append(f"- Lifestyle: {', '.join(profile.lifestyle)}")
    if profile.dietaryPreferences:
        parts.append(f"- Diet: {', '.join(profile.dietaryPreferences)}")
    return "\n".join(parts)


def coach_chat(messages: list[ChatMessageIn], profile: Optional[Profile]) -> str:
    client = _client()
    if client is None:
        return _coach_fallback(messages, profile)
    settings = get_settings()
    try:
        payload = [{"role": "system", "content": _system_prompt(profile)}]
        payload += [{"role": m.role, "content": m.content} for m in messages if m.role != "system"]
        resp = client.chat.completions.create(
            model=settings.openai_model,
            messages=payload,
            max_tokens=400,
            temperature=0.6,
        )
        return (resp.choices[0].message.content or "").strip() or _coach_fallback(messages, profile)
    except Exception:
        return _coach_fallback(messages, profile)


def _coach_fallback(messages: list[ChatMessageIn], profile: Optional[Profile]) -> str:
    last = next((m.content.lower() for m in reversed(messages) if m.role == "user"), "")
    name = f", {profile.displayName}" if profile and profile.displayName else ""
    goal = profile.goal if profile and profile.goal else "maintain"
    if any(k in last for k in ["meal", "eat", "food", "dinner", "lunch", "breakfast"]):
        return (
            f"Simple high-protein idea{name}: a palm of protein (chicken/tofu/fish), a fist of carbs, "
            "and a big handful of veg. Busy day? A Greek yogurt or protein shake still counts."
        )
    if any(k in last for k in ["workout", "train", "gym", "run", "lift", "exercise"]):
        return (
            f"No-stress plan{name}: 20–40 min full-body circuit (squat, push, pull, core) or a brisk run. "
            "Missed yesterday? No guilt — just do today. Consistency beats perfection."
        )
    if any(k in last for k in ["supplement", "creatine", "vitamin", "protein"]):
        return f"For your goal, solid picks are: {', '.join(GOAL_SUPPLEMENTS.get(goal, []))}. Take with a meal."
    if any(k in last for k in ["tired", "busy", "stress", "time", "kids"]):
        return (
            f"Totally understandable{name}. On hectic days, shrink the goal: a 10-minute walk, one protein-forward "
            "meal, and water. Small anchors keep momentum."
        )
    return (
        f"I'm your Apexia coach{name}. Ask me about meals, workouts, supplements, or staying on track on a busy day."
    )


# ---------------------------------------------------------------------------
# Daily plan
# ---------------------------------------------------------------------------


def daily_plan(profile: Optional[Profile]) -> CoachPlan:
    client = _client()
    if client is not None and profile is not None:
        plan = _plan_via_ai(client, profile)
        if plan is not None:
            return plan
    return _plan_fallback(profile)


def _plan_via_ai(client, profile: Profile) -> Optional[CoachPlan]:
    settings = get_settings()
    prompt = (
        "Create a realistic one-day plan for this user that flexes around a busy schedule. "
        "Respond ONLY with JSON: {\"summary\": str, \"focus\": str, \"items\": "
        "[{\"kind\": one_of[meal|workout|supplement|habit], \"title\": str, \"detail\": str, \"time\": str}]}. "
        "Include 4-6 items covering meals, one workout, supplements, and a recovery/hydration habit. "
        f"User: {profile.model_dump_json()}"
    )
    try:
        resp = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": _system_prompt(profile)},
                {"role": "user", "content": prompt},
            ],
            max_tokens=700,
            temperature=0.5,
        )
        data = _extract_json(resp.choices[0].message.content or "")
        items = [
            DailyPlanItem(
                id=str(uuid.uuid4()),
                kind=it.get("kind", "habit"),
                title=it.get("title", ""),
                detail=it.get("detail", ""),
                time=it.get("time"),
            )
            for it in data.get("items", [])
        ]
        if not items:
            return None
        return CoachPlan(
            summary=data.get("summary", ""),
            focus=data.get("focus", ""),
            items=items,
            generatedAt=_now_iso(),
        )
    except Exception:
        return None


def _plan_fallback(profile: Optional[Profile]) -> CoachPlan:
    goal = profile.goal if profile and profile.goal else "maintain"
    cals = int(profile.targets.calories) if profile and profile.targets else 2200
    supps = ", ".join(GOAL_SUPPLEMENTS.get(goal, [])[:2])
    return CoachPlan(
        summary=f"A balanced day tuned for {GOAL_LABELS.get(goal, goal)} that flexes around a busy schedule.",
        focus="Protein + progressive lifting" if goal == "build_muscle" else "Balance & consistency",
        generatedAt=_now_iso(),
        items=[
            DailyPlanItem(id=str(uuid.uuid4()), kind="meal", title="Protein-forward breakfast",
                          detail=f"~{int(cals*0.25)} kcal, 30g+ protein.", time="8:00 AM"),
            DailyPlanItem(id=str(uuid.uuid4()), kind="workout", title="Full-body strength (35 min)",
                          detail="Short and effective. A 15-min version still counts.", time="12:30 PM"),
            DailyPlanItem(id=str(uuid.uuid4()), kind="meal", title="Balanced plate lunch",
                          detail="Lean protein + carb + veg. Snap a photo to log it.", time="1:30 PM"),
            DailyPlanItem(id=str(uuid.uuid4()), kind="supplement", title=f"Supplements: {supps}",
                          detail="Take with a meal.", time="6:00 PM"),
            DailyPlanItem(id=str(uuid.uuid4()), kind="habit", title="Wind-down + hydration",
                          detail="Hydrate and aim for 7+ hours sleep.", time="9:30 PM"),
        ],
    )
