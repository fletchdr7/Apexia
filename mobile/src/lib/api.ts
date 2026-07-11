import type {
  BodyScanResult,
  ChatMessage,
  CoachPlan,
  EquipmentScanResult,
  FoodScanResult,
  PlannedExercise,
  Supplement,
  UserProfile,
  WorkoutLocation,
  WorkoutPlan,
} from '@/types';
import { COMMON_SUPPLEMENTS, GOAL_SUPPLEMENT_HINTS } from '@/constants/supplements';
import { uid } from '@/utils/id';
import { goalLabel } from '@/utils/nutrition';
import { estimateWeightKg, repSchemeForGoal } from '@/utils/strength';
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

// ---------------------------------------------------------------------------
// Supplement analysis
// ---------------------------------------------------------------------------

export async function analyzeSupplementPhoto(imageBase64: string): Promise<Omit<Supplement, 'id'>> {
  if (config.hasAiBackend) {
    return post<Omit<Supplement, 'id'>>('/vision/supplement', { image: imageBase64 });
  }
  const sample = COMMON_SUPPLEMENTS[0];
  return { ...sample, name: sample.name };
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

export interface EquipmentInput {
  name: string;
  exampleExercises?: string[];
  primaryMuscles?: string[];
}

export interface WorkoutPlanParams {
  profile: UserProfile | null;
  location: WorkoutLocation;
  durationMin: number;
  muscleGroups: string[];
  equipment: EquipmentInput[];
}

export async function generateWorkoutPlan(params: WorkoutPlanParams): Promise<WorkoutPlan> {
  if (config.hasAiBackend) {
    return post<WorkoutPlan>('/coach/workout', {
      profile: params.profile,
      location: params.location,
      durationMin: params.durationMin,
      muscleGroups: params.muscleGroups,
      equipment: params.equipment,
    });
  }
  return localWorkoutPlan(params);
}

export interface SwapExerciseParams {
  profile: UserProfile | null;
  exercise: string;
  muscles: string[];
  equipment: EquipmentInput[];
}

/** Returns alternative exercises for the same muscle group from available equipment. */
export async function swapExercise(params: SwapExerciseParams): Promise<PlannedExercise[]> {
  if (config.hasAiBackend) {
    const res = await post<{ alternatives: PlannedExercise[] }>('/coach/swap', {
      profile: params.profile,
      exercise: params.exercise,
      muscles: params.muscles,
      equipment: params.equipment,
    });
    return res.alternatives ?? [];
  }
  return localSwaps(params);
}

function localSwaps({ profile, exercise, muscles, equipment }: SwapExerciseParams): PlannedExercise[] {
  const scheme = repSchemeForGoal(profile?.goal ?? 'maintain');
  const target = muscles.map((m) => m.toLowerCase());
  const pool: PlannedExercise[] = [];
  for (const e of equipment) {
    const matches = target.length === 0 || (e.primaryMuscles ?? []).some((m) => target.some((t) => m.toLowerCase().includes(t) || t.includes(m.toLowerCase())));
    if (!matches) continue;
    for (const ex of e.exampleExercises ?? [e.name]) {
      if (ex.toLowerCase() === exercise.toLowerCase()) continue;
      pool.push({
        name: ex,
        equipment: e.name,
        sets: scheme.sets,
        reps: scheme.reps,
        restSec: scheme.restSec,
        muscles: e.primaryMuscles,
        suggestedWeight: e.name.toLowerCase() === 'bodyweight' ? 'bodyweight' : 'moderate',
      });
    }
  }
  // de-dup by name
  const seen = new Set<string>();
  return pool.filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true))).slice(0, 6);
}

function localWorkoutPlan({ profile, location, durationMin, muscleGroups, equipment }: WorkoutPlanParams): WorkoutPlan {
  const goal = profile?.goal ?? 'maintain';
  const scheme = repSchemeForGoal(goal);
  const experience = profile?.experience ?? 'beginner';
  const bodyweight = profile?.weightKg ?? 75;
  const sexFactor = profile?.sex === 'female' ? 0.7 : 1;
  const slots = Math.max(3, Math.min(8, Math.floor((durationMin - 10) / 7)));

  const wantsAll = muscleGroups.length === 0 || muscleGroups.includes('full_body');
  const targets = muscleGroups.map((m) => m.toLowerCase());
  const matchesMuscle = (muscles?: string[]) =>
    wantsAll || (muscles ?? []).some((m) => targets.some((t) => m.toLowerCase().includes(t) || t.includes(m.toLowerCase())));

  const pool: { name: string; equipment: string; muscles?: string[] }[] = [];
  for (const e of equipment) {
    if (!matchesMuscle(e.primaryMuscles)) continue;
    const exercises = e.exampleExercises && e.exampleExercises.length ? e.exampleExercises : [e.name];
    for (const ex of exercises) pool.push({ name: ex, equipment: e.name, muscles: e.primaryMuscles });
  }
  const base = pool.length
    ? pool
    : [
        { name: 'Push-ups', equipment: 'Bodyweight' },
        { name: 'Bodyweight squats', equipment: 'Bodyweight' },
        { name: 'Plank', equipment: 'Bodyweight' },
        { name: 'Lunges', equipment: 'Bodyweight' },
        { name: 'Glute bridge', equipment: 'Bodyweight' },
      ];

  const exercises: PlannedExercise[] = base.slice(0, slots).map((c) => {
    const kg = estimateWeightKg(c.name, bodyweight, experience, sexFactor);
    const isBodyweight = c.equipment.toLowerCase() === 'bodyweight';
    return {
      name: c.name,
      equipment: c.equipment,
      sets: scheme.sets,
      reps: scheme.reps,
      restSec: scheme.restSec,
      muscles: c.muscles,
      suggestedWeight: isBodyweight ? 'bodyweight' : kg ? `~${kg} kg` : 'moderate',
    };
  });

  return {
    title: `${location === 'home' ? 'Home' : 'Gym'} workout`,
    focus: 'Full body',
    location,
    durationMin,
    warmup: ['5 min easy cardio', 'Dynamic stretches for the muscles you\u2019ll train'],
    exercises,
    cooldown: ['3\u20135 min easy walk', 'Stretch the muscles you trained'],
    notes: 'Starting estimate \u2014 adjust so the last 1\u20132 reps are challenging.',
    generatedAt: new Date().toISOString(),
  };
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
