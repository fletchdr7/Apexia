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


class EquipmentResult(BaseModel):
    name: str
    category: str = "other"
    primaryMuscles: list[str] = []
    description: str = ""
    exampleExercises: list[str] = []
    howToUse: Optional[str] = None
    confidence: float = Field(default=0.5, ge=0, le=1)
    notes: Optional[str] = None


class BodyFocusArea(BaseModel):
    area: str
    observation: str
    action: str


class BodyScanResult(BaseModel):
    summary: str
    estimatedComposition: Optional[str] = None
    focusAreas: list[BodyFocusArea] = []
    training: list[str] = []
    nutrition: list[str] = []
    milestones: list[str] = []
    encouragement: str = ""
    disclaimer: str = ""
    confidence: float = Field(default=0.5, ge=0, le=1)


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
    experience: Optional[str] = None
    goal: Optional[GoalType] = None
    weeklyWorkoutTarget: Optional[int] = None
    preferredActivities: list[str] = []
    lifestyle: list[str] = []
    dietaryPreferences: list[str] = []
    targets: Optional[NutritionTargets] = None


class BodyScanRequest(BaseModel):
    images: list[str] = []
    profile: Optional[Profile] = None
    context: Optional[dict] = None


class ImageRequest(BaseModel):
    image: str = Field(description="Base64-encoded JPEG/PNG (no data URI prefix required)")
    mode: Mode = "plate"


class SupplementImageRequest(BaseModel):
    image: str


class EquipmentImageRequest(BaseModel):
    image: str


class SupplementLookupRequest(BaseModel):
    name: str


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


class EquipmentInput(BaseModel):
    name: str
    exampleExercises: list[str] = []
    primaryMuscles: list[str] = []


class PlannedExercise(BaseModel):
    name: str
    equipment: Optional[str] = None
    sets: int = 3
    reps: str = "8-12"
    suggestedWeight: Optional[str] = None
    restSec: Optional[int] = None
    muscles: list[str] = []
    notes: Optional[str] = None


class WorkoutPlan(BaseModel):
    title: str
    focus: str
    location: str = "gym"
    durationMin: int = 45
    warmup: list[str] = []
    exercises: list[PlannedExercise] = []
    cooldown: list[str] = []
    notes: Optional[str] = None
    generatedAt: str


class WorkoutPlanRequest(BaseModel):
    profile: Optional[Profile] = None
    location: str = "gym"
    durationMin: int = 45
    muscleGroups: list[str] = []
    equipment: list[EquipmentInput] = []


class SwapRequest(BaseModel):
    profile: Optional[Profile] = None
    exercise: str
    muscles: list[str] = []
    equipment: list[EquipmentInput] = []


class SwapResponse(BaseModel):
    alternatives: list[PlannedExercise] = []


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
