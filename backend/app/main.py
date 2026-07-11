from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__, ai
from .config import get_settings
from .schemas import (
    BodyScanRequest,
    BodyScanResult,
    ChatRequest,
    ChatResponse,
    CoachPlan,
    EquipmentImageRequest,
    EquipmentResult,
    FoodScanResult,
    ImageRequest,
    PlanRequest,
    SupplementImageRequest,
    SupplementResult,
    SwapRequest,
    SwapResponse,
    WorkoutPlan,
    WorkoutPlanRequest,
)
from .security import verify_auth

settings = get_settings()

app = FastAPI(
    title="Apexia AI Backend",
    version=__version__,
    description="Food/supplement vision, coaching chat, and daily plans for the Apexia app.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {"name": "Apexia AI Backend", "version": __version__, "docs": "/docs"}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "openai": settings.has_openai, "auth": settings.require_auth}


@app.get("/diag/openai")
def diag_openai() -> dict:
    """Actively tests the OpenAI connection and returns the real result/error."""
    return ai.diagnose_openai()


@app.post("/vision/food", response_model=FoodScanResult)
def vision_food(req: ImageRequest, _auth=Depends(verify_auth)) -> FoodScanResult:
    return ai.analyze_food(req.image, req.mode)


@app.post("/vision/supplement", response_model=SupplementResult)
def vision_supplement(req: SupplementImageRequest, _auth=Depends(verify_auth)) -> SupplementResult:
    return ai.analyze_supplement(req.image)


@app.post("/vision/equipment", response_model=EquipmentResult)
def vision_equipment(req: EquipmentImageRequest, _auth=Depends(verify_auth)) -> EquipmentResult:
    return ai.analyze_equipment(req.image)


@app.post("/coach/chat", response_model=ChatResponse)
def coach_chat(req: ChatRequest, _auth=Depends(verify_auth)) -> ChatResponse:
    return ChatResponse(content=ai.coach_chat(req.messages, req.profile))


@app.post("/coach/plan", response_model=CoachPlan)
def coach_plan(req: PlanRequest, _auth=Depends(verify_auth)) -> CoachPlan:
    return ai.daily_plan(req.profile)


@app.post("/coach/body-scan", response_model=BodyScanResult)
def coach_body_scan(req: BodyScanRequest, _auth=Depends(verify_auth)) -> BodyScanResult:
    return ai.analyze_body_scan(req)


@app.post("/coach/workout", response_model=WorkoutPlan)
def coach_workout(req: WorkoutPlanRequest, _auth=Depends(verify_auth)) -> WorkoutPlan:
    return ai.generate_workout(req)


@app.post("/coach/swap", response_model=SwapResponse)
def coach_swap(req: SwapRequest, _auth=Depends(verify_auth)) -> SwapResponse:
    return SwapResponse(alternatives=ai.suggest_swaps(req))
