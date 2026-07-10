import type {
  ActivityLevel,
  GoalType,
  NutritionTargets,
  Nutrients,
  Sex,
  UserProfile,
} from '@/types';

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

/** Mifflin-St Jeor basal metabolic rate. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  // "other" -> average of the two sex constants
  return base - 78;
}

export function tdee(sex: Sex, weightKg: number, heightCm: number, age: number, level: ActivityLevel): number {
  return Math.round(bmr(sex, weightKg, heightCm, age) * ACTIVITY_MULTIPLIER[level]);
}

const GOAL_CALORIE_ADJUST: Record<GoalType, number> = {
  lose_fat: -0.18,
  build_muscle: 0.12,
  recomp: -0.05,
  maintain: 0,
  endurance: 0.05,
};

// grams of protein per kg bodyweight
const GOAL_PROTEIN_PER_KG: Record<GoalType, number> = {
  lose_fat: 2.0,
  build_muscle: 2.0,
  recomp: 2.0,
  maintain: 1.6,
  endurance: 1.6,
};

// share of remaining (non-protein) calories that come from fat
const GOAL_FAT_SHARE: Record<GoalType, number> = {
  lose_fat: 0.35,
  build_muscle: 0.3,
  recomp: 0.32,
  maintain: 0.35,
  endurance: 0.28,
};

export function computeTargets(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  goal: GoalType;
}): NutritionTargets {
  const maintenance = tdee(input.sex, input.weightKg, input.heightCm, input.age, input.activityLevel);
  const calories = Math.round(maintenance * (1 + GOAL_CALORIE_ADJUST[input.goal]));

  const proteinG = Math.round(input.weightKg * GOAL_PROTEIN_PER_KG[input.goal]);
  const proteinCals = proteinG * 4;

  const remaining = Math.max(calories - proteinCals, 0);
  const fatCals = remaining * GOAL_FAT_SHARE[input.goal];
  const carbCals = remaining - fatCals;

  const fatG = Math.round(fatCals / 9);
  const carbsG = Math.round(carbCals / 4);

  const waterMl = Math.round(input.weightKg * 35);

  return { calories, proteinG, carbsG, fatG, waterMl };
}

export function ageFromBirthYear(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

export function emptyNutrients(): Nutrients {
  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 };
}

export function addNutrients(a: Nutrients, b: Nutrients, servings = 1): Nutrients {
  return {
    calories: a.calories + b.calories * servings,
    proteinG: a.proteinG + b.proteinG * servings,
    carbsG: a.carbsG + b.carbsG * servings,
    fatG: a.fatG + b.fatG * servings,
    fiberG: (a.fiberG ?? 0) + (b.fiberG ?? 0) * servings,
    sugarG: (a.sugarG ?? 0) + (b.sugarG ?? 0) * servings,
    sodiumMg: (a.sodiumMg ?? 0) + (b.sodiumMg ?? 0) * servings,
  };
}

/** Rough MET-based calorie burn estimate when the user didn't provide one. */
export function estimateCaloriesBurned(met: number, weightKg: number, durationMin: number): number {
  return Math.round((met * 3.5 * weightKg) / 200 * durationMin);
}

export function clampPct(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function goalLabel(goal: GoalType): string {
  switch (goal) {
    case 'lose_fat':
      return 'Lose fat';
    case 'build_muscle':
      return 'Build muscle';
    case 'recomp':
      return 'Body recomposition';
    case 'maintain':
      return 'Maintain & feel great';
    case 'endurance':
      return 'Endurance';
  }
}

export function profileAge(profile: Pick<UserProfile, 'birthYear'>): number {
  return ageFromBirthYear(profile.birthYear);
}
