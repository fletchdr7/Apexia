import type {
  BodyScanResult,
  ChatMessage,
  CoachPlan,
  EquipmentScanResult,
  FoodScanResult,
  Nutrients,
  PlannedExercise,
  Supplement,
  UserProfile,
  WorkoutLocation,
  WorkoutPlan,
} from '@/types';
import type { FoodSearchResult } from '@/lib/foodSearch';
import { COMMON_SUPPLEMENTS, GOAL_SUPPLEMENT_HINTS } from '@/constants/supplements';
import { selectLibraryExercises, swapCandidates, type ExerciseMedia } from '@/lib/exerciseMedia';
import { uid } from '@/utils/id';
import { goalLabel } from '@/utils/nutrition';
import { estimateWeightKg, repSchemeForGoal, type RepScheme } from '@/utils/strength';
import { config } from './config';
import { supabase } from './supabase';

/**
 * The AI service layer.
 *
 * Every function first tries the configured Python AI backend. If the backend
 * is not configured (demo mode) it falls back to a deterministic, genuinely
 * useful local heuristic so the app is fully explorable without any servers.
 */

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch(`${config.aiApiBaseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Food vision
// ---------------------------------------------------------------------------

export async function analyzeFoodPhoto(
  imageBase64: string,
  mode: 'label' | 'plate',
): Promise<FoodScanResult> {
  if (config.hasAiBackend) {
    return post<FoodScanResult>('/vision/food', { image: imageBase64, mode });
  }
  return mockFoodScan(mode);
}

function mockFoodScan(mode: 'label' | 'plate'): FoodScanResult {
  if (mode === 'label') {
    return {
      name: 'Scanned nutrition label',
      items: [
        {
          name: 'Packaged food (per serving)',
          portion: '1 serving',
          nutrients: { calories: 210, proteinG: 8, carbsG: 27, fatG: 7, fiberG: 3, sugarG: 9, sodiumMg: 180 },
        },
      ],
      total: { calories: 210, proteinG: 8, carbsG: 27, fatG: 7, fiberG: 3, sugarG: 9, sodiumMg: 180 },
      confidence: 0.7,
      notes: 'Demo estimate. Connect the AI backend for real OCR of the label.',
    };
  }
  return {
    name: 'Chicken, veg & carb plate',
    items: [
      { name: 'Grilled chicken breast', portion: '~150 g', nutrients: { calories: 240, proteinG: 45, carbsG: 0, fatG: 6 } },
      { name: 'Mixed vegetables', portion: '~120 g', nutrients: { calories: 70, proteinG: 3, carbsG: 12, fatG: 1, fiberG: 5 } },
      { name: 'Rice / carb', portion: '~1 cup', nutrients: { calories: 205, proteinG: 4, carbsG: 45, fatG: 1 } },
    ],
    total: { calories: 515, proteinG: 52, carbsG: 57, fatG: 8, fiberG: 5 },
    confidence: 0.68,
    notes: 'Demo estimate. Connect the AI backend for a vision model that reads your actual plate.',
  };
}

/** AI nutrition estimate for a typed food (fallback when Open Food Facts misses). */
export async function estimateFood(name: string): Promise<FoodSearchResult> {
  const clean = name.trim();
  if (config.hasAiBackend) {
    const r = await post<{ name: string; servingLabel: string; nutrients: Nutrients; confidence: number }>(
      '/coach/food-lookup',
      { name: clean },
    );
    return { id: `ai:${clean}`, name: r.name || clean, nutrients: r.nutrients, basis: 'serving', servingLabel: r.servingLabel || '1 serving' };
  }
  return {
    id: `ai:${clean}`,
    name: clean,
    nutrients: { calories: 200, proteinG: 8, carbsG: 25, fatG: 8 },
    basis: 'serving',
    servingLabel: '1 serving',
  };
}

// ---------------------------------------------------------------------------
// Supplement analysis
// ---------------------------------------------------------------------------

export async function analyzeSupplementPhoto(imageBase64: string): Promise<Omit<Supplement, 'id'>> {
  if (config.hasAiBackend) {
    return post<Omit<Supplement, 'id'>>('/vision/supplement', { image: imageBase64 });
  }
  return { name: 'Unknown supplement', form: 'capsule', ingredients: [] };
}

/** Look up a supplement's details by name (like the food search, AI-backed). */
export async function lookupSupplement(name: string): Promise<Omit<Supplement, 'id'>> {
  const clean = name.trim();
  if (config.hasAiBackend) {
    return post<Omit<Supplement, 'id'>>('/coach/supplement-lookup', { name: clean });
  }
  const q = clean.toLowerCase();
  const found = COMMON_SUPPLEMENTS.find(
    (s) => s.name.toLowerCase().includes(q) || (q && q.includes(s.name.toLowerCase().split(' ')[0])),
  );
  if (found) return { ...found };
  return { name: clean || 'Unknown supplement', form: 'capsule', ingredients: [] };
}

// ---------------------------------------------------------------------------
// Equipment vision
// ---------------------------------------------------------------------------

export async function analyzeEquipmentPhoto(imageBase64: string): Promise<EquipmentScanResult> {
  if (config.hasAiBackend) {
    return post<EquipmentScanResult>('/vision/equipment', { image: imageBase64 });
  }
  return {
    name: 'Unrecognized equipment',
    category: 'machine',
    primaryMuscles: [],
    description: 'Connect the AI backend to identify gym equipment from a photo.',
    exampleExercises: [],
    confidence: 0.4,
    notes: 'Demo mode — connect the AI backend for real equipment recognition.',
  };
}

// ---------------------------------------------------------------------------
// Workout plan builder
// ---------------------------------------------------------------------------

export interface WorkoutPlanParams {
  profile: UserProfile | null;
  location: WorkoutLocation;
  durationMin: number;
  muscleGroups: string[];
  /** Equipment tags the user has, in exercise-library terms (e.g. 'barbell'). */
  availableEquipment: string[];
}

function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function toPlanned(lib: ExerciseMedia, profile: UserProfile | null, scheme: RepScheme): PlannedExercise {
  const bodyweight = profile?.weightKg ?? 75;
  const experience = profile?.experience ?? 'beginner';
  const sexFactor = profile?.sex === 'female' ? 0.7 : 1;
  const isBody = !lib.equipment || lib.equipment === 'body only';
  const kg = isBody ? undefined : estimateWeightKg(lib.name, bodyweight, experience, sexFactor);
  return {
    name: lib.name,
    equipment: lib.equipment ?? undefined,
    sets: scheme.sets,
    reps: scheme.reps,
    restSec: scheme.restSec,
    muscles: lib.primaryMuscles,
    suggestedWeight: isBody ? 'bodyweight' : kg ? `~${kg} kg` : 'moderate',
  };
}

/** Convert a library exercise into a planned exercise for the user's goal. */
export function plannedFromMedia(media: ExerciseMedia, profile: UserProfile | null): PlannedExercise {
  return toPlanned(media, profile, repSchemeForGoal(profile?.goal ?? 'maintain'));
}

/**
 * Builds the plan directly from the bundled exercise library so every suggested
 * exercise is a real entry with a matching demo, muscles, and instructions.
 */
export async function generateWorkoutPlan(params: WorkoutPlanParams): Promise<WorkoutPlan> {
  const scheme = repSchemeForGoal(params.profile?.goal ?? 'maintain');
  const slots = Math.max(3, Math.min(8, Math.floor((params.durationMin - 10) / 7)));
  const available = new Set(params.availableEquipment);
  const libs = selectLibraryExercises(params.muscleGroups, available, slots);
  const exercises = libs.map((l) => toPlanned(l, params.profile, scheme));
  const focusGroups = params.muscleGroups.filter((m) => m !== 'full_body');
  const focus = focusGroups.length ? focusGroups.map(cap).join(' & ') : 'Full body';
  return {
    title: `${params.location === 'home' ? 'Home' : 'Gym'} · ${focus}`,
    focus,
    location: params.location,
    durationMin: params.durationMin,
    warmup: ['5 min easy cardio', 'Dynamic stretches for the muscles you\u2019ll train'],
    exercises,
    cooldown: ['3\u20135 min easy walk', 'Stretch the muscles you trained'],
    notes: 'Tap an exercise for a demo. Adjust weights so the last 1\u20132 reps are challenging.',
    generatedAt: new Date().toISOString(),
  };
}

export interface SwapExerciseParams {
  profile: UserProfile | null;
  exercise: string;
  muscles: string[];
  availableEquipment: string[];
}

/** Alternative library exercises for the same muscle(s) — always demo-backed. */
export async function swapExercise(params: SwapExerciseParams): Promise<PlannedExercise[]> {
  const scheme = repSchemeForGoal(params.profile?.goal ?? 'maintain');
  const cands = swapCandidates(params.muscles, new Set(params.availableEquipment), params.exercise, 6);
  return cands.map((l) => toPlanned(l, params.profile, scheme));
}

export function analyzeSupplementForGoal(
  supplement: Omit<Supplement, 'id'>,
  profile: UserProfile | null,
): { goalFit: number; verdict: string } {
  const goal = profile?.goal ?? 'maintain';
  const recommended = GOAL_SUPPLEMENT_HINTS[goal];
  const match = recommended.some((n) => supplement.name.toLowerCase().includes(n.toLowerCase().split(' ')[0]));
  const goalFit = match ? 0.9 : supplement.goalFit ?? 0.5;
  const verdict = match
    ? `Strong fit for your goal to ${goalLabel(goal).toLowerCase()}.`
    : `Reasonable general-health choice, but not a top priority for ${goalLabel(goal).toLowerCase()}.`;
  return { goalFit, verdict };
}

// ---------------------------------------------------------------------------
// Body scan (physique assessment)
// ---------------------------------------------------------------------------

export interface BodyScanContext {
  weight?: { startKg?: number; currentKg?: number; targetKg?: number; changeKg?: number };
  topLifts?: { name: string; bestKg?: number; sessions: number }[];
  workoutsLast30?: number;
  nutritionAvg?: { calories: number; proteinG: number } | null;
  equipment?: string[];
}

export async function analyzeBodyScan(params: {
  images: string[];
  profile: UserProfile | null;
  context: BodyScanContext;
}): Promise<BodyScanResult> {
  if (config.hasAiBackend) {
    return post<BodyScanResult>('/coach/body-scan', {
      images: params.images,
      profile: params.profile,
      context: params.context,
    });
  }
  return localBodyScan(params.profile);
}

function localBodyScan(profile: UserProfile | null): BodyScanResult {
  const goal = profile?.goal ?? 'maintain';
  return {
    summary: `A personalized plan focused on ${goalLabel(goal).toLowerCase()}, built from your logged data.`,
    estimatedComposition: 'Connect the AI backend for a photo-based visual assessment.',
    focusAreas: [
      { area: 'Consistency', observation: 'Habits drive change.', action: 'Hit your weekly workout and protein targets most days.' },
      { area: 'Progressive overload', observation: 'Strength builds physique.', action: 'Add reps or a little weight on key lifts each week.' },
    ],
    training: ['Train each muscle group ~2x/week', 'Prioritize compound lifts, add isolation for lagging areas'],
    nutrition: [
      profile?.targets ? `Hit ~${profile.targets.proteinG}g protein daily` : 'Keep protein high and consistent',
      'Favor whole foods; keep calories aligned with your goal',
    ],
    milestones: ['4 workouts/week for a month', 'Add a little weight to a main lift', 'Stay in calorie range 5 days/week'],
    encouragement: "You've got the data and the tools — small steps compound fast.",
    disclaimer: 'General guidance only, not medical advice.',
    confidence: 0.5,
  };
}

// ---------------------------------------------------------------------------
// Coach chat
// ---------------------------------------------------------------------------

export async function chatWithCoach(
  messages: ChatMessage[],
  profile: UserProfile | null,
): Promise<ChatMessage> {
  if (config.hasAiBackend) {
    const reply = await post<{ content: string }>('/coach/chat', {
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      profile,
    });
    return { id: uid('m_'), role: 'assistant', content: reply.content, createdAt: new Date().toISOString() };
  }
  return {
    id: uid('m_'),
    role: 'assistant',
    content: localCoachReply(messages, profile),
    createdAt: new Date().toISOString(),
  };
}

function localCoachReply(messages: ChatMessage[], profile: UserProfile | null): string {
  const last = [...messages].reverse().find((m) => m.role === 'user')?.content.toLowerCase() ?? '';
  const name = profile?.displayName ? `, ${profile.displayName}` : '';
  const t = profile?.targets;

  if (/meal|eat|food|dinner|lunch|breakfast/.test(last)) {
    return `Here's a simple, high-protein idea${name}: grilled chicken or tofu, a fist of rice or potato, and a big handful of veg. ${
      t ? `Aim for roughly ${t.proteinG}g protein across the day.` : ''
    } Keep it flexible — if today is chaotic, a Greek yogurt + fruit or a protein shake still counts as a win.`;
  }
  if (/workout|train|exercise|gym|run|lift/.test(last)) {
    return `No-stress plan${name}: if you have 20–40 minutes, do a full-body circuit (squat, push, pull, core) or a brisk run. Missed yesterday? No guilt — just do today. Consistency beats perfection.`;
  }
  if (/supplement|creatine|protein|vitamin/.test(last)) {
    const goal = profile?.goal ?? 'maintain';
    return `For your goal, the essentials are usually protein powder (to hit targets) and creatine (5g daily). ${GOAL_SUPPLEMENT_HINTS[goal].slice(0, 3).join(', ')} are solid picks. Add vitamin D and omega-3 for general health.`;
  }
  if (/tired|busy|stress|time|kids|work/.test(last)) {
    return `Totally understandable${name}. On hectic days, shrink the goal: a 10-minute walk, one solid protein-forward meal, and water. Small anchors keep momentum without the pressure of a perfect routine.`;
  }
  return `I'm your Apexia coach${name}. Ask me about meals, workouts, supplements, or how to stay on track on a busy day. ${
    t ? `Today's targets: ${t.calories} kcal, ${t.proteinG}g protein.` : ''
  }`;
}

// ---------------------------------------------------------------------------
// Daily plan generation
// ---------------------------------------------------------------------------

export async function generateDailyPlan(profile: UserProfile | null): Promise<CoachPlan> {
  if (config.hasAiBackend && profile) {
    return post<CoachPlan>('/coach/plan', { profile });
  }
  return localDailyPlan(profile);
}

function localDailyPlan(profile: UserProfile | null): CoachPlan {
  const goal = profile?.goal ?? 'maintain';
  const t = profile?.targets;
  const supps = GOAL_SUPPLEMENT_HINTS[goal].slice(0, 2);

  return {
    summary: profile
      ? `A balanced day tuned to ${goalLabel(goal).toLowerCase()} that flexes around a busy schedule.`
      : 'Finish onboarding to get a plan tailored to your goals.',
    focus: goal === 'lose_fat' ? 'Protein + steps' : goal === 'build_muscle' ? 'Protein + progressive lifting' : 'Balance & consistency',
    generatedAt: new Date().toISOString(),
    items: [
      {
        id: uid('p_'),
        kind: 'meal',
        title: 'Protein-forward breakfast',
        detail: t ? `~${Math.round(t.calories * 0.25)} kcal, 30g+ protein. Eggs or Greek yogurt + fruit.` : 'Eggs or Greek yogurt + fruit.',
        time: '8:00 AM',
      },
      {
        id: uid('p_'),
        kind: 'workout',
        title: goal === 'endurance' ? 'Zone-2 cardio (30–40 min)' : 'Full-body strength (35 min)',
        detail: 'Short and effective. If today is packed, a 15-min version still counts.',
        time: '12:30 PM',
      },
      {
        id: uid('p_'),
        kind: 'meal',
        title: 'Balanced plate lunch',
        detail: 'Lean protein + carb + veg. Snap a photo to log it in seconds.',
        time: '1:30 PM',
      },
      {
        id: uid('p_'),
        kind: 'supplement',
        title: `Supplements: ${supps.join(', ')}`,
        detail: 'Take with a meal. Consistency matters more than timing.',
        time: '6:00 PM',
      },
      {
        id: uid('p_'),
        kind: 'habit',
        title: 'Wind-down + hydration',
        detail: t ? `Hit ~${(t.waterMl / 1000).toFixed(1)} L water and aim for 7+ hours sleep.` : 'Hydrate and aim for 7+ hours sleep.',
        time: '9:30 PM',
      },
    ],
  };
}
