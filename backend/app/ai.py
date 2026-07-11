"""AI logic: food/supplement vision, coaching chat, and daily plans.

Every function uses OpenAI when an API key is configured and otherwise returns a
deterministic heuristic result, so the backend is always usable in development.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from .config import get_settings

logger = logging.getLogger("apexia.ai")
from .schemas import (
    ChatMessageIn,
    CoachPlan,
    DailyPlanItem,
    BodyScanRequest,
    BodyScanResult,
    EquipmentInput,
    EquipmentResult,
    FoodEstimate,
    FoodScanResult,
    Nutrients,
    PlannedExercise,
    Profile,
    SupplementResult,
    SwapRequest,
    WorkoutPlan,
    WorkoutPlanRequest,
)

GOAL_REP_SCHEME = {
    "build_muscle": {"sets": 4, "reps": "8-12", "restSec": 90},
    "lose_fat": {"sets": 3, "reps": "12-15", "restSec": 45},
    "recomp": {"sets": 3, "reps": "10-12", "restSec": 60},
    "endurance": {"sets": 3, "reps": "15-20", "restSec": 30},
    "maintain": {"sets": 3, "reps": "10-12", "restSec": 60},
}

EQUIPMENT_CATEGORIES = {
    "free_weights",
    "machine",
    "cable",
    "cardio",
    "bodyweight",
    "accessory",
    "other",
}

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
        logger.exception("Failed to create OpenAI client")
        return None


def diagnose_openai() -> dict:
    """Make a tiny real OpenAI call so failures (bad key, no quota, no model
    access) are visible in the browser instead of silently falling back."""
    settings = get_settings()
    if not settings.has_openai:
        return {"ok": False, "reason": "OPENAI_API_KEY is not set on the server"}
    client = _client()
    if client is None:
        return {"ok": False, "reason": "OpenAI client could not be created (see logs)"}
    try:
        resp = client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": "Reply with the single word: pong"}],
            max_tokens=5,
        )
        return {
            "ok": True,
            "chat_model": settings.openai_model,
            "vision_model": settings.openai_vision_model,
            "reply": (resp.choices[0].message.content or "").strip(),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "chat_model": settings.openai_model,
            "error_type": type(exc).__name__,
            "error": str(exc)[:600],
        }


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
        logger.exception("Food vision call failed; returning heuristic")
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


def estimate_food(name: str) -> FoodEstimate:
    client = _client()
    clean = (name or "").strip()
    fallback = FoodEstimate(
        name=clean or "Food",
        servingLabel="1 serving",
        nutrients=Nutrients(calories=200, proteinG=8, carbsG=25, fatG=8),
        confidence=0.3,
    )
    if client is None or not clean:
        return fallback
    settings = get_settings()
    prompt = (
        "Estimate the nutrition for one typical serving of the food below. Respond ONLY with JSON: "
        '{"servingLabel": str, "calories": num, "proteinG": num, "carbsG": num, "fatG": num, '
        '"fiberG": num, "sugarG": num, "sodiumMg": num}. Be realistic for a normal portion.\nFood: '
        + clean
    )
    try:
        resp = client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=250,
            temperature=0.2,
        )
        d = _extract_json(resp.choices[0].message.content or "")
        return FoodEstimate(
            name=clean,
            servingLabel=str(d.get("servingLabel") or "1 serving"),
            nutrients=Nutrients(
                calories=d.get("calories", 0),
                proteinG=d.get("proteinG", 0),
                carbsG=d.get("carbsG", 0),
                fatG=d.get("fatG", 0),
                fiberG=d.get("fiberG"),
                sugarG=d.get("sugarG"),
                sodiumMg=d.get("sodiumMg"),
            ),
            confidence=0.6,
        )
    except Exception:
        logger.exception("Food estimate failed")
        return fallback


# ---------------------------------------------------------------------------
# Supplement vision
# ---------------------------------------------------------------------------

SUPPLEMENT_PROMPT = (
    "You are a supplement expert. Read this supplement label and analyze it. "
    "Respond ONLY with JSON: "
    '{"name": str, "brand": str, "form": one_of[capsule|tablet|powder|liquid|gummy|softgel], '
    '"servingSize": str, "ingredients": [{"name": str, "amount": num, "unit": str, "dailyValuePct": num}], '
    '"purpose": str, "benefits": [str], "cautions": [str], "timing": str, "goalFit": num_0_to_1}. '
    "Be accurate and evidence-based; keep benefits/cautions short. "
    "If you cannot clearly identify the supplement from the image, set name to 'Unknown supplement', "
    "leave ingredients/benefits/cautions empty, and set goalFit to 0."
)

SUPPLEMENT_LOOKUP_PROMPT = (
    "Provide an evidence-based analysis of the dietary supplement named below. "
    "Respond ONLY with JSON: "
    '{"name": str, "form": one_of[capsule|tablet|powder|liquid|gummy|softgel], "servingSize": str, '
    '"ingredients": [{"name": str, "amount": num, "unit": str}], "purpose": str, "benefits": [str], '
    '"cautions": [str], "timing": str}. Keep it concise and accurate. '
    "If the name is not a real/known supplement, set name to 'Unknown supplement' and leave the rest empty.\n"
    "Supplement name: "
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
        logger.exception("Supplement vision call failed; returning heuristic")
        return _supplement_fallback()


def _supplement_fallback() -> SupplementResult:
    return SupplementResult(
        name="Unknown supplement",
        form="capsule",
        ingredients=[],
        purpose="",
        benefits=[],
        cautions=[],
        goalFit=0,
    )


def lookup_supplement(name: str) -> SupplementResult:
    client = _client()
    clean = (name or "").strip()
    if client is None or not clean:
        return SupplementResult(name=clean or "Unknown supplement", form="capsule", ingredients=[], benefits=[], cautions=[])
    settings = get_settings()
    try:
        resp = client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": SUPPLEMENT_LOOKUP_PROMPT + clean}],
            max_tokens=600,
            temperature=0.2,
        )
        data = _extract_json(resp.choices[0].message.content or "")
        return SupplementResult.model_validate(data)
    except Exception:
        logger.exception("Supplement lookup failed")
        return SupplementResult(name=clean, form="capsule", ingredients=[], benefits=[], cautions=[])


# ---------------------------------------------------------------------------
# Equipment vision
# ---------------------------------------------------------------------------

EQUIPMENT_PROMPT = (
    "You are a strength coach. Identify the gym equipment in this photo. "
    "Respond ONLY with JSON: "
    '{"name": str, "category": one_of[free_weights|machine|cable|cardio|bodyweight|accessory|other], '
    '"primaryMuscles": [str], "description": str, "exampleExercises": [str (2-4 items)], '
    '"howToUse": str, "confidence": num_0_to_1}. '
    "Keep description to one or two sentences. If unsure, still give your best guess with lower confidence."
)


def analyze_equipment(image_b64: str) -> EquipmentResult:
    client = _client()
    if client is None or not image_b64:
        return _equipment_fallback()
    settings = get_settings()
    try:
        resp = client.chat.completions.create(
            model=settings.openai_vision_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": EQUIPMENT_PROMPT},
                        {"type": "image_url", "image_url": {"url": _data_uri(image_b64)}},
                    ],
                }
            ],
            max_tokens=600,
            temperature=0.2,
        )
        data = _extract_json(resp.choices[0].message.content or "")
        if data.get("category") not in EQUIPMENT_CATEGORIES:
            data["category"] = "other"
        return EquipmentResult.model_validate(data)
    except Exception:
        logger.exception("Equipment vision call failed; returning heuristic")
        return _equipment_fallback()


def _equipment_fallback() -> EquipmentResult:
    return EquipmentResult(
        name="Unrecognized equipment",
        category="other",
        primaryMuscles=[],
        description="Set OPENAI_API_KEY for real equipment recognition.",
        exampleExercises=[],
        confidence=0.4,
        notes="Heuristic fallback.",
    )


# ---------------------------------------------------------------------------
# Body scan (physique assessment + personalized plan)
# ---------------------------------------------------------------------------

BODY_SCAN_SYSTEM = (
    "You are Apexia, a supportive, professional personal trainer. You are analyzing "
    "progress photos to give constructive, encouraging, health- and performance-focused "
    "guidance. STRICT RULES: be kind and body-positive, never shaming; do NOT give medical "
    "diagnoses; do NOT state exact body-fat percentages as fact (use gentle qualitative ranges "
    "only); avoid any language that could encourage disordered eating; focus on actionable, "
    "sustainable habits. Use ALL of the user's data provided to personalize the plan."
)

BODY_SCAN_PROMPT = (
    "Analyze the physique photo(s) together with the user's data below and produce a personalized "
    "assessment. Respond ONLY with JSON: {\"summary\": str, \"estimatedComposition\": str (gentle, "
    "qualitative, e.g. 'lean and athletic'), \"focusAreas\": [{\"area\": str, \"observation\": str, "
    "\"action\": str}], \"training\": [str], \"nutrition\": [str], \"milestones\": [str], "
    "\"encouragement\": str, \"disclaimer\": str, \"confidence\": num_0_to_1}. "
    "3-5 focus areas; training/nutrition as concise, specific bullets tuned to their goal, equipment, "
    "and current numbers; 2-4 realistic milestones. Keep it motivating and practical.\n\nUSER DATA:\n"
)


def analyze_body_scan(req: BodyScanRequest) -> BodyScanResult:
    client = _client()
    data_blob = json.dumps({"profile": req.profile.model_dump() if req.profile else None, "context": req.context})
    if client is None or not req.images:
        return _body_scan_fallback(req)
    settings = get_settings()
    try:
        content: list = [{"type": "text", "text": BODY_SCAN_PROMPT + data_blob}]
        for img in req.images[:3]:
            content.append({"type": "image_url", "image_url": {"url": _data_uri(img)}})
        resp = client.chat.completions.create(
            model=settings.openai_vision_model,
            messages=[
                {"role": "system", "content": BODY_SCAN_SYSTEM},
                {"role": "user", "content": content},
            ],
            max_tokens=1200,
            temperature=0.5,
        )
        parsed = _extract_json(resp.choices[0].message.content or "")
        result = BodyScanResult.model_validate(parsed)
        if not result.disclaimer:
            result.disclaimer = (
                "This is an AI estimate from photos for general guidance only — not medical advice. "
                "Consult a professional for personalized medical or nutrition needs."
            )
        return result
    except Exception:
        logger.exception("Body scan call failed; using heuristic")
        return _body_scan_fallback(req)


def _body_scan_fallback(req: BodyScanRequest) -> BodyScanResult:
    goal = (req.profile.goal if req.profile and req.profile.goal else "maintain")
    supps = ", ".join(GOAL_SUPPLEMENTS.get(goal, [])[:2])
    return BodyScanResult(
        summary=f"A personalized plan focused on {GOAL_LABELS.get(goal, goal)}, built from your logged data.",
        estimatedComposition="Add photos and connect the AI backend for a visual assessment.",
        focusAreas=[
            {"area": "Consistency", "observation": "Progress comes from repeatable habits.", "action": "Hit your weekly workout target and protein goal most days."},
            {"area": "Progressive overload", "observation": "Strength drives change.", "action": "Add reps or a little weight each session on your key lifts."},
        ],
        training=[
            "Train each muscle group ~2x/week with your available equipment.",
            "Prioritize compound lifts; add isolation for lagging areas.",
        ],
        nutrition=[
            f"Hit ~{int(req.profile.targets.proteinG)}g protein daily." if req.profile and req.profile.targets else "Keep protein high and consistent.",
            "Favor whole foods; keep calories aligned with your goal.",
        ],
        milestones=["Log 4 workouts/week for a month", "Add 2.5kg to a main lift", "Stay within calorie target 5 days/week"],
        encouragement="You've got the tools and the data — small consistent steps compound fast.",
        disclaimer="General guidance only, not medical advice.",
        confidence=0.5,
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
        logger.exception("Coach chat call failed; returning heuristic")
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
# Workout plan builder
# ---------------------------------------------------------------------------


def generate_workout(req: WorkoutPlanRequest) -> WorkoutPlan:
    client = _client()
    if client is not None:
        plan = _workout_via_ai(client, req)
        if plan is not None:
            return plan
    return _workout_fallback(req)


def _workout_via_ai(client, req: WorkoutPlanRequest) -> Optional[WorkoutPlan]:
    settings = get_settings()
    p = req.profile
    equipment_names = [e.name for e in req.equipment]
    bodyweight = p.weightKg if p and p.weightKg else 75
    experience = (p.experience if p and p.experience else "beginner")
    sex = (p.sex if p and p.sex else "male")
    goal = (p.goal if p and p.goal else "maintain")

    focus_line = (
        f"Focus on these muscle groups: {req.muscleGroups}. "
        if req.muscleGroups and "full_body" not in req.muscleGroups
        else "Train the full body. "
    )
    prompt = (
        f"Build a single {req.location} workout that fits in about {req.durationMin} minutes. "
        f"{focus_line}"
        f"Only use these available equipment items: {equipment_names or ['bodyweight only']}. "
        f"The user: bodyweight {bodyweight} kg, sex {sex}, experience {experience}, goal {goal}. "
        "Pick an appropriate number of exercises for the time budget (include warm-up and cool-down). "
        "For each weighted exercise, suggest a CONSERVATIVE starting weight in kg based on their bodyweight "
        "and experience (bodyweight movements should say 'bodyweight'). Use rep ranges suited to the goal. "
        "Respond ONLY with JSON: {\"title\": str, \"focus\": str, \"warmup\": [str], "
        "\"exercises\": [{\"name\": str, \"equipment\": str, \"sets\": int, \"reps\": str, "
        "\"suggestedWeight\": str, \"restSec\": int, \"muscles\": [str], \"notes\": str}], "
        "\"cooldown\": [str], \"notes\": str}. Keep notes short; weights are starting estimates to adjust."
    )
    try:
        resp = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": _system_prompt(req.profile)},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1100,
            temperature=0.5,
        )
        data = _extract_json(resp.choices[0].message.content or "")
        exercises = [PlannedExercise.model_validate(ex) for ex in data.get("exercises", [])]
        if not exercises:
            return None
        return WorkoutPlan(
            title=data.get("title", f"{req.location.title()} workout"),
            focus=data.get("focus", ""),
            location=req.location,
            durationMin=req.durationMin,
            warmup=data.get("warmup", []),
            exercises=exercises,
            cooldown=data.get("cooldown", []),
            notes=data.get("notes"),
            generatedAt=_now_iso(),
        )
    except Exception:
        logger.exception("Workout plan call failed; using heuristic")
        return None


def _workout_fallback(req: WorkoutPlanRequest) -> WorkoutPlan:
    goal = (req.profile.goal if req.profile and req.profile.goal else "maintain")
    scheme = GOAL_REP_SCHEME.get(goal, GOAL_REP_SCHEME["maintain"])
    # roughly one exercise per ~7 minutes after warm-up/cool-down
    slots = max(3, min(8, (req.durationMin - 10) // 7))

    pool: list[tuple[str, str]] = []  # (exercise, equipment)
    for e in req.equipment:
        for ex in (e.exampleExercises or [e.name]):
            pool.append((ex, e.name))
    if not pool:
        pool = [("Push-ups", "Bodyweight"), ("Bodyweight squats", "Bodyweight"), ("Plank", "Bodyweight"), ("Lunges", "Bodyweight")]

    chosen = pool[:slots]
    exercises = [
        PlannedExercise(
            name=name,
            equipment=equip,
            sets=scheme["sets"],
            reps=scheme["reps"],
            restSec=scheme["restSec"],
            suggestedWeight="bodyweight" if equip.lower() == "bodyweight" else "moderate — leave ~2 reps in reserve",
        )
        for name, equip in chosen
    ]
    return WorkoutPlan(
        title=f"{req.location.title()} workout",
        focus="Full body",
        location=req.location,
        durationMin=req.durationMin,
        warmup=["5 min easy cardio", "Dynamic stretches for the muscles you'll train"],
        exercises=exercises,
        cooldown=["3-5 min walk", "Stretch the muscles you trained"],
        notes="Starting estimate — adjust weights so the last 1-2 reps are challenging.",
        generatedAt=_now_iso(),
    )


def suggest_swaps(req: SwapRequest) -> list[PlannedExercise]:
    client = _client()
    scheme = GOAL_REP_SCHEME.get(
        (req.profile.goal if req.profile and req.profile.goal else "maintain"), GOAL_REP_SCHEME["maintain"]
    )
    if client is not None:
        try:
            settings = get_settings()
            prompt = (
                f"The user wants to replace '{req.exercise}' (targets: {req.muscles}). "
                f"Suggest 4 alternative exercises that train the same muscle group(s) using ONLY this "
                f"available equipment: {[e.name for e in req.equipment] or ['bodyweight']}. "
                "Do not include the original exercise. Respond ONLY with JSON: "
                '{"alternatives": [{"name": str, "equipment": str, "muscles": [str], "notes": str}]}.'
            )
            resp = client.chat.completions.create(
                model=settings.openai_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.4,
            )
            data = _extract_json(resp.choices[0].message.content or "")
            out: list[PlannedExercise] = []
            for alt in data.get("alternatives", []):
                out.append(
                    PlannedExercise(
                        name=alt.get("name", ""),
                        equipment=alt.get("equipment"),
                        sets=scheme["sets"],
                        reps=scheme["reps"],
                        restSec=scheme["restSec"],
                        muscles=alt.get("muscles", []),
                        notes=alt.get("notes"),
                    )
                )
            if out:
                return out
        except Exception:
            logger.exception("Swap suggestion failed; using heuristic")

    # Fallback: pull matching exercises from equipment example lists.
    targets = [m.lower() for m in req.muscles]
    out: list[PlannedExercise] = []
    seen: set[str] = set()
    for e in req.equipment:
        matches = not targets or any(
            any(t in m.lower() or m.lower() in t for t in targets) for m in e.primaryMuscles
        )
        if not matches:
            continue
        for ex in (e.exampleExercises or [e.name]):
            if ex.lower() == req.exercise.lower() or ex.lower() in seen:
                continue
            seen.add(ex.lower())
            out.append(
                PlannedExercise(
                    name=ex,
                    equipment=e.name,
                    sets=scheme["sets"],
                    reps=scheme["reps"],
                    restSec=scheme["restSec"],
                    muscles=e.primaryMuscles,
                    suggestedWeight="bodyweight" if e.name.lower() == "bodyweight" else "moderate",
                )
            )
    return out[:6]


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
        logger.exception("Daily plan call failed; using heuristic")
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
