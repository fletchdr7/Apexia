import type {
  BodyCompositionEntry,
  FoodEntry,
  Supplement,
  SupplementLog,
  UserProfile,
  WorkoutEntry,
} from '@/types';
import { computeTargets } from '@/utils/nutrition';

function isoAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function isoDaysAgo(days: number): string {
  return isoAgo(days * 24);
}

export const DEMO_PROFILE: UserProfile = (() => {
  const base = {
    sex: 'male' as const,
    weightKg: 82,
    heightCm: 180,
    age: 34,
    activityLevel: 'moderate' as const,
    goal: 'recomp' as const,
  };
  return {
    id: 'demo-user',
    displayName: 'Alex',
    sex: base.sex,
    birthYear: new Date().getFullYear() - base.age,
    heightCm: base.heightCm,
    weightKg: base.weightKg,
    targetWeightKg: 78,
    activityLevel: base.activityLevel,
    goal: base.goal,
    weeklyWorkoutTarget: 4,
    preferredActivities: ['gym', 'run', 'reformer_pilates'],
    lifestyle: ['busy_job', 'kids'],
    dietaryPreferences: ['high_protein'],
    units: 'metric',
    onboardedAt: new Date().toISOString(),
    targets: computeTargets(base),
  };
})();

export const DEMO_WORKOUTS: WorkoutEntry[] = [
  {
    id: 'w1',
    type: 'gym',
    title: 'Push day',
    performedAt: isoAgo(20),
    durationMin: 55,
    intensity: 'hard',
    caloriesBurned: 320,
    source: 'manual',
    exercises: [
      { name: 'Bench press', sets: [{ reps: 8, weightKg: 70 }, { reps: 8, weightKg: 70 }, { reps: 6, weightKg: 75 }] },
      { name: 'Overhead press', sets: [{ reps: 10, weightKg: 40 }, { reps: 8, weightKg: 42.5 }] },
    ],
  },
  {
    id: 'w2',
    type: 'run',
    title: 'Easy morning run',
    performedAt: isoAgo(44),
    durationMin: 32,
    intensity: 'easy',
    distanceKm: 5.4,
    caloriesBurned: 360,
    source: 'manual',
  },
  {
    id: 'w3',
    type: 'reformer_pilates',
    title: 'Reformer flow',
    performedAt: isoAgo(70),
    durationMin: 45,
    intensity: 'moderate',
    caloriesBurned: 210,
    source: 'manual',
  },
];

const OATMEAL_NUTRIENTS = { calories: 320, proteinG: 12, carbsG: 54, fatG: 7, fiberG: 8, sugarG: 12 };

export const DEMO_FOODS: FoodEntry[] = [
  // A repeated breakfast so the "Quick add" regulars surface right away.
  { id: 'f_oat1', name: 'Oatmeal + banana', slot: 'breakfast', loggedAt: isoDaysAgo(3), servings: 1, source: 'search', nutrients: OATMEAL_NUTRIENTS },
  { id: 'f_oat2', name: 'Oatmeal + banana', slot: 'breakfast', loggedAt: isoDaysAgo(2), servings: 1, source: 'search', nutrients: OATMEAL_NUTRIENTS },
  { id: 'f_oat3', name: 'Oatmeal + banana', slot: 'breakfast', loggedAt: isoDaysAgo(1), servings: 1, source: 'search', nutrients: OATMEAL_NUTRIENTS },
  {
    id: 'f1',
    name: 'Greek yogurt + berries',
    slot: 'breakfast',
    loggedAt: isoAgo(6),
    servings: 1,
    source: 'search',
    nutrients: { calories: 260, proteinG: 22, carbsG: 30, fatG: 6, fiberG: 4, sugarG: 18 },
  },
  {
    id: 'f2',
    name: 'Chicken, rice & greens plate',
    slot: 'lunch',
    loggedAt: isoAgo(2),
    servings: 1,
    source: 'plate_scan',
    confidence: 0.82,
    nutrients: { calories: 540, proteinG: 45, carbsG: 55, fatG: 14, fiberG: 6 },
  },
];

export const DEMO_SUPPLEMENTS: Supplement[] = [
  {
    id: 's1',
    name: 'Creatine Monohydrate',
    form: 'powder',
    servingSize: '5 g',
    ingredients: [{ name: 'Creatine Monohydrate', amount: 5, unit: 'g' }],
    purpose: 'Strength & power output',
    benefits: ['Increases strength and lean mass', 'Improves recovery'],
    cautions: ['Stay hydrated'],
    timing: 'Any time daily',
    goalFit: 0.95,
  },
  {
    id: 's2',
    name: 'Whey Protein Isolate',
    form: 'powder',
    servingSize: '1 scoop (32 g)',
    ingredients: [
      { name: 'Protein', amount: 25, unit: 'g' },
      { name: 'Carbohydrate', amount: 2, unit: 'g' },
      { name: 'Fat', amount: 1, unit: 'g' },
    ],
    nutrients: { calories: 120, proteinG: 25, carbsG: 2, fatG: 1 },
    purpose: 'Convenient high-quality protein',
    benefits: ['Supports muscle growth & recovery', 'Helps hit daily protein target'],
    cautions: ['Contains dairy'],
    timing: 'Post-workout or any time to top up protein',
    goalFit: 0.9,
  },
];

export const DEMO_SUPPLEMENT_LOGS: SupplementLog[] = [
  { id: 'sl1', supplementId: 's1', supplementName: 'Creatine Monohydrate', takenAt: isoAgo(7), dose: '5 g' },
];

// Simulated smart-scale trend: body fat trending down, lean mass up (recomposition).
export const DEMO_BODY_COMPOSITION: BodyCompositionEntry[] = [
  { id: 'bc_d1', loggedAt: isoDaysAgo(56), weightKg: 84.2, bodyFatPct: 22.5, leanMassKg: 62.6, bmi: 26.0 },
  { id: 'bc_d2', loggedAt: isoDaysAgo(42), weightKg: 83.6, bodyFatPct: 21.6, leanMassKg: 63.1, bmi: 25.8 },
  { id: 'bc_d3', loggedAt: isoDaysAgo(28), weightKg: 83.1, bodyFatPct: 20.8, leanMassKg: 63.6, bmi: 25.6 },
  { id: 'bc_d4', loggedAt: isoDaysAgo(14), weightKg: 82.6, bodyFatPct: 20.1, leanMassKg: 64.0, bmi: 25.5 },
  { id: 'bc_d5', loggedAt: isoDaysAgo(3), weightKg: 82.0, bodyFatPct: 19.4, leanMassKg: 64.4, bmi: 25.3 },
];
