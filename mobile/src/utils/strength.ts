import type { ExerciseRecord, ExperienceLevel, GoalType } from '@/types';

export function exerciseKey(name: string): string {
  return name.trim().toLowerCase();
}

function topRepOfRange(reps: string): number {
  const nums = reps.match(/\d+/g);
  if (!nums) return 12;
  return Number(nums[nums.length - 1]);
}

/**
 * Progressive-overload suggestion from a past performance record. If the user
 * hit the top of the rep range last time, nudge the weight up; otherwise keep
 * the weight and aim for another rep.
 */
export function progressionFor(record: ExerciseRecord, goalReps: string): { suggestedWeight?: string; note: string } {
  if (record.lastWeightKg == null) {
    return { note: `Last: bodyweight × ${record.lastReps ?? '—'}` };
  }
  const top = topRepOfRange(goalReps);
  const last = record.lastWeightKg;
  if ((record.lastReps ?? 0) >= top) {
    const incr = last < 10 ? 1 : 2.5;
    const next = Math.round((last + incr) * 2) / 2; // nearest 0.5 kg
    return {
      suggestedWeight: `~${next} kg`,
      note: `Last: ${last}kg × ${record.lastReps} — try +${incr}kg`,
    };
  }
  return {
    suggestedWeight: `~${last} kg`,
    note: `Last: ${last}kg × ${record.lastReps} — aim for +1 rep`,
  };
}

export interface RepScheme {
  sets: number;
  reps: string;
  restSec: number;
}

/** Sensible default set/rep/rest scheme for each goal. */
export function repSchemeForGoal(goal: GoalType): RepScheme {
  switch (goal) {
    case 'build_muscle':
      return { sets: 4, reps: '8-12', restSec: 90 };
    case 'lose_fat':
      return { sets: 3, reps: '12-15', restSec: 45 };
    case 'recomp':
      return { sets: 3, reps: '10-12', restSec: 60 };
    case 'endurance':
      return { sets: 3, reps: '15-20', restSec: 30 };
    case 'maintain':
    default:
      return { sets: 3, reps: '10-12', restSec: 60 };
  }
}

export function experienceLabel(level: ExperienceLevel): string {
  switch (level) {
    case 'beginner':
      return 'Beginner';
    case 'intermediate':
      return 'Intermediate';
    case 'advanced':
      return 'Advanced';
  }
}

const EXPERIENCE_EFFORT: Record<ExperienceLevel, string> = {
  beginner: 'Start light and focus on form — leave 3-4 reps in reserve.',
  intermediate: 'Work at a challenging but controlled weight — leave ~2 reps in reserve.',
  advanced: 'Push close to failure on the last set with good form.',
};

export function effortCue(level: ExperienceLevel): string {
  return EXPERIENCE_EFFORT[level];
}

/**
 * Rough starting-weight estimate (kg) for a few common barbell/dumbbell lifts,
 * used only in the offline fallback. The AI backend gives better, per-exercise
 * numbers. Returns undefined for movements we can't estimate (-> qualitative).
 */
const LIFT_BODYWEIGHT_RATIO: Record<string, number> = {
  squat: 0.75,
  'front squat': 0.55,
  deadlift: 1.0,
  'romanian deadlift': 0.7,
  bench: 0.6,
  'bench press': 0.6,
  'incline press': 0.5,
  'overhead press': 0.4,
  'shoulder press': 0.4,
  row: 0.55,
  'bent-over row': 0.55,
  'lat pulldown': 0.5,
  'leg press': 1.5,
  curl: 0.18,
  'bicep curl': 0.18,
};

const EXPERIENCE_FACTOR: Record<ExperienceLevel, number> = {
  beginner: 0.6,
  intermediate: 0.85,
  advanced: 1.1,
};

export function estimateWeightKg(
  exerciseName: string,
  bodyweightKg: number,
  experience: ExperienceLevel,
  sexFactor = 1,
): number | undefined {
  const key = Object.keys(LIFT_BODYWEIGHT_RATIO).find((k) => exerciseName.toLowerCase().includes(k));
  if (!key) return undefined;
  const raw = bodyweightKg * LIFT_BODYWEIGHT_RATIO[key] * EXPERIENCE_FACTOR[experience] * sexFactor;
  // round to nearest 2.5 kg
  return Math.max(2.5, Math.round(raw / 2.5) * 2.5);
}
