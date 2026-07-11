export type Sex = 'male' | 'female' | 'other';

export type GoalType = 'lose_fat' | 'build_muscle' | 'recomp' | 'maintain' | 'endurance';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type WorkoutLocation = 'home' | 'gym';

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
  experience?: ExperienceLevel;
  goal: GoalType;
  weeklyWorkoutTarget: number;
  preferredActivities: WorkoutType[];
  lifestyle: LifestyleTag[];
  dietaryPreferences: string[];
  units: UnitSystem;
  onboardedAt?: string;
  /** Selected AI coach avatar id (see constants/avatars). */
  coachAvatarId?: string;
  /** Latest body composition (e.g. imported from a smart scale via Apple Health). */
  bodyComposition?: { bodyFatPct?: number; leanMassKg?: number; bmi?: number; updatedAt?: string };
  /** Optional strength target for one lift (e.g. bench press to 100 kg). */
  strengthGoal?: { exercise: string; targetKg: number };
  // Derived nutrition targets
  targets: NutritionTargets;
}

export interface WeightEntry {
  id: string;
  loggedAt: string; // ISO
  weightKg: number;
}

/** A body-composition reading (e.g. from a smart scale via Apple Health). */
export interface BodyCompositionEntry {
  id: string;
  loggedAt: string; // ISO
  weightKg?: number;
  bodyFatPct?: number;
  leanMassKg?: number;
  bmi?: number;
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
  /** Macros contributed per serving (e.g. protein powder). Optional — many supplements have none. */
  nutrients?: Nutrients;
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

export type EquipmentCategory =
  | 'free_weights'
  | 'machine'
  | 'cable'
  | 'cardio'
  | 'bodyweight'
  | 'accessory'
  | 'other';

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  primaryMuscles: string[];
  description?: string;
  exampleExercises?: string[];
  howToUse?: string;
  source: 'catalog' | 'scan' | 'manual';
}

export interface ExerciseRecord {
  name: string;
  lastWeightKg?: number;
  lastReps?: number;
  bestWeightKg?: number;
  sessions: number;
  updatedAt: string;
}

export interface PlannedExercise {
  name: string;
  equipment?: string;
  sets: number;
  reps: string; // e.g. "8-12" or "12" or "30s"
  suggestedWeight?: string; // e.g. "20 kg", "bodyweight", "moderate"
  restSec?: number;
  muscles?: string[];
  notes?: string;
}

export interface WorkoutPlan {
  title: string;
  focus: string;
  location: WorkoutLocation;
  durationMin: number;
  warmup: string[];
  exercises: PlannedExercise[];
  cooldown: string[];
  notes?: string;
  generatedAt: string;
}

/** AI equipment-scan result returned by the vision endpoint. */
export interface EquipmentScanResult {
  name: string;
  category: EquipmentCategory;
  primaryMuscles: string[];
  description: string;
  exampleExercises: string[];
  howToUse?: string;
  confidence: number;
  notes?: string;
}

export interface BodyFocusArea {
  area: string;
  observation: string;
  action: string;
}

export interface BodyScanResult {
  summary: string;
  estimatedComposition?: string;
  focusAreas: BodyFocusArea[];
  training: string[];
  nutrition: string[];
  milestones: string[];
  encouragement: string;
  disclaimer: string;
  confidence: number;
}

export interface BodyAssessment {
  id: string;
  createdAt: string;
  result: BodyScanResult;
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
