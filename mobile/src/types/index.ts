export type Sex = 'male' | 'female' | 'other';

export type GoalType = 'lose_fat' | 'build_muscle' | 'recomp' | 'maintain' | 'endurance';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';

export type UnitSystem = 'metric' | 'imperial';

export type LifestyleTag =
  | 'busy_job'
  | 'kids'
  | 'travel'
  | 'shift_work'
  | 'limited_equipment'
  | 'eats_out'
  | 'poor_sleep';

export interface UserProfile {
  id: string;
  displayName: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  activityLevel: ActivityLevel;
  goal: GoalType;
  weeklyWorkoutTarget: number;
  preferredActivities: WorkoutType[];
  lifestyle: LifestyleTag[];
  dietaryPreferences: string[];
  units: UnitSystem;
  onboardedAt?: string;
  // Derived nutrition targets
  targets: NutritionTargets;
}

export interface NutritionTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

export type WorkoutType =
  | 'gym'
  | 'home'
  | 'run'
  | 'cycling'
  | 'reformer_pilates'
  | 'yoga'
  | 'swim'
  | 'hiit'
  | 'walk'
  | 'sport'
  | 'mobility';

export type Intensity = 'easy' | 'moderate' | 'hard' | 'max';

export interface StrengthSet {
  reps: number;
  weightKg?: number;
}

export interface StrengthExercise {
  name: string;
  sets: StrengthSet[];
}

export interface WorkoutEntry {
  id: string;
  type: WorkoutType;
  title: string;
  performedAt: string; // ISO
  durationMin: number;
  intensity: Intensity;
  caloriesBurned?: number;
  distanceKm?: number;
  notes?: string;
  exercises?: StrengthExercise[];
  source?: 'manual' | 'coach' | 'import';
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Nutrients {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
}

export interface FoodEntry {
  id: string;
  name: string;
  slot: MealSlot;
  loggedAt: string; // ISO
  servings: number;
  nutrients: Nutrients;
  source: 'manual' | 'label_scan' | 'plate_scan' | 'search' | 'coach';
  photoUri?: string;
  confidence?: number; // 0..1 for AI estimates
}

export type SupplementForm = 'capsule' | 'tablet' | 'powder' | 'liquid' | 'gummy' | 'softgel';

export interface SupplementIngredient {
  name: string;
  amount: number;
  unit: string; // mg, g, mcg, IU
  dailyValuePct?: number;
}

export interface Supplement {
  id: string;
  name: string;
  brand?: string;
  form: SupplementForm;
  servingSize?: string;
  ingredients: SupplementIngredient[];
  // AI analysis
  purpose?: string;
  benefits?: string[];
  cautions?: string[];
  timing?: string;
  goalFit?: number; // 0..1 how well it fits the user's goal
}

export interface SupplementLog {
  id: string;
  supplementId: string;
  supplementName: string;
  takenAt: string; // ISO
  dose: string;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface DailyPlanItem {
  id: string;
  kind: 'meal' | 'workout' | 'supplement' | 'habit';
  title: string;
  detail: string;
  time?: string;
  done?: boolean;
}

export interface CoachPlan {
  summary: string;
  focus: string;
  items: DailyPlanItem[];
  generatedAt: string;
}

/** AI food-scan result returned by the vision endpoint. */
export interface FoodScanResult {
  name: string;
  items: Array<{ name: string; portion: string; nutrients: Nutrients }>;
  total: Nutrients;
  confidence: number;
  notes?: string;
}
