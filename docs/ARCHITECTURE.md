# Architecture

Apexia is intentionally split into three small, independent pieces so you can
learn and iterate on each one without breaking the others.

## 1. Mobile app (`mobile/`)

- **Stack:** Expo (React Native) + TypeScript, [expo-router](https://docs.expo.dev/router/introduction/)
  for file‑based navigation, `react-native-svg` for charts/rings.
- **Design system:** `src/theme` (light/dark aware colors, spacing, typography)
  and `src/components` (Button, Card, Chip, Input, ProgressRing, MacroBar, etc.).
- **State:** `src/store/AppStore.tsx` is a React context backed by AsyncStorage.
  It's the single source of truth for the UI and works fully offline. On first
  onboarding it seeds sample data so the app never looks empty.
- **Services:** `src/lib/api.ts` is the AI service layer. Each function calls the
  Python backend if configured (`EXPO_PUBLIC_AI_API_URL`) and otherwise falls
  back to an on‑device heuristic, so the app is always functional.
- **Supabase:** `src/lib/supabase.ts` creates a client only when configured. The
  database schema in `supabase/` matches the app's data model for syncing.

### Data model

Defined once in `mobile/src/types/index.ts` and mirrored in `backend/app/schemas.py`
and `supabase/schema.sql`:

- `UserProfile` + derived `NutritionTargets`
- `WorkoutEntry` (+ optional `StrengthExercise`/`StrengthSet`)
- `FoodEntry` (+ `Nutrients`, `MealSlot`, `source`)
- `Supplement` (+ `SupplementIngredient`) and `SupplementLog`
- `ChatMessage`, `CoachPlan` / `DailyPlanItem`

### How targets are computed

`src/utils/nutrition.ts` uses the **Mifflin‑St Jeor** equation for BMR, an
activity multiplier for TDEE, and goal‑specific calorie/macro splits (e.g. higher
protein for muscle building, a moderate deficit for fat loss).

## 2. AI backend (`backend/`)

- **Stack:** Python + FastAPI. Pydantic models validate every request/response.
- **Endpoints:**
  - `POST /vision/food` — estimate nutrition from a **plate** or **label** photo.
  - `POST /vision/supplement` — read a supplement label and analyze it.
  - `POST /coach/chat` — conversational coaching with your profile as context.
  - `POST /coach/plan` — generate a flexible daily plan.
  - `GET /health` — status + whether OpenAI is configured.
- **AI provider:** `app/ai.py` uses OpenAI vision + chat models. Without an API
  key it returns deterministic heuristics (same shape) so development never
  requires credentials or spend.
- **Auth (optional):** `app/security.py` can verify Supabase user JWTs when
  `REQUIRE_AUTH=true`.
- **Deployment:** ASGI (uvicorn) anywhere, or WSGI via `wsgi.py` + `a2wsgi` for
  PythonAnywhere.

## 3. Database (`supabase/`)

- `schema.sql` defines tables for profiles, workouts, food, supplements, logs,
  and chat, all protected by **Row Level Security** (each user sees only their
  own rows). A trigger auto‑creates a profile row on sign‑up.

## Request flow: scanning a meal

1. User taps **Scan** → `mobile/app/nutrition/scan.tsx` opens the camera.
2. A photo is captured as base64 and sent to `analyzeFoodPhoto()` in `api.ts`.
3. If the backend is configured, it POSTs to `/vision/food`; the backend calls a
   vision model and returns structured `Nutrients`.
4. The user confirms the meal/servings; it's saved to the store (and, once wired,
   synced to Supabase).

## Why this split fits you

- You already know **Python** → the AI logic is Python.
- You already know **Supabase** → auth + data + RLS are Supabase.
- You already know **PythonAnywhere** → the backend deploys there via WSGI.
- You **don't need a Mac** → Expo + EAS build and ship iOS from the cloud.
