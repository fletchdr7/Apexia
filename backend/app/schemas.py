from typing import Literal, Optional

from pydantic import BaseModel, Field

Mode = Literal["plate", "label"]
GoalType = Literal["lose_fat", "build_muscle", "recomp", "maintain", "endurance"]


class Nutrients(BaseModel):
    calories: float = 0
    proteinG: float = 0
    carbsG: float = 0
    fatG: float = 0
    fiberG: Optional[float] = None
    sugarG: Optional[float] = None
    sodiumMg: Optional[float] = None


class FoodItem(BaseModel):
    name: str
    portion: str
    nutrients: Nutrients


class FoodScanResult(BaseModel):
    name: str
    items: list[FoodItem]
    total: Nutrients
    confidence: float = Field(ge=0, le=1)
    notes: Optional[str] = None


class SupplementIngredient(BaseModel):
    name: str
    amount: float
    unit: str
    dailyValuePct: Optional[float] = None


class SupplementResult(BaseModel):
    name: str
    brand: Optional[str] = None
    form: str = "capsule"
    servingSize: Optional[str] = None
    ingredients: list[SupplementIngredient] = []
    purpose: Optional[str] = None
    benefits: list[str] = []
    cautions: list[str] = []
    timing: Optional[str] = None
    goalFit: Optional[float] = None


class NutritionTargets(BaseModel):
    calories: float
    proteinG: float
    carbsG: float
    fatG: float
    waterMl: float


class Profile(BaseModel):
    displayName: Optional[str] = None
    sex: Optional[str] = None
    birthYear: Optional[int] = None
    heightCm: Optional[float] = None
    weightKg: Optional[float] = None
    targetWeightKg: Optional[float] = None
    activityLevel: Optional[str] = None
    goal: Optional[GoalType] = None
    weeklyWorkoutTarget: Optional[int] = None
    preferredActivities: list[str] = []
    lifestyle: list[str] = []
    dietaryPreferences: list[str] = []
    targets: Optional[NutritionTargets] = None


class ImageRequest(BaseModel):
    image: str = Field(description="Base64-encoded JPEG/PNG (no data URI prefix required)")
    mode: Mode = "plate"


class SupplementImageRequest(BaseModel):
    image: str


class ChatMessageIn(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessageIn]
    profile: Optional[Profile] = None


class ChatResponse(BaseModel):
    content: str


class PlanRequest(BaseModel):
    profile: Optional[Profile] = None


class DailyPlanItem(BaseModel):
    id: str
    kind: Literal["meal", "workout", "supplement", "habit"]
    title: str
    detail: str
    time: Optional[str] = None
    done: Optional[bool] = None


class CoachPlan(BaseModel):
    summary: str
    focus: str
    items: list[DailyPlanItem]
    generatedAt: str
