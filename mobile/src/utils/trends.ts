import type { BodyCompositionEntry, GoalType, WorkoutEntry } from '@/types';

const round1 = (n: number) => Math.round(n * 10) / 10;

export type MetricKey = 'bodyFatPct' | 'leanMassKg' | 'bmi' | 'weightKg';

export interface MetricSeries {
  key: MetricKey;
  points: { date: string; value: number }[];
  first: number;
  latest: number;
  delta: number;
}

/** Chronological series of a single metric, ignoring days it wasn't recorded. */
export function metricSeries(logs: BodyCompositionEntry[], key: MetricKey): MetricSeries | null {
  const points = logs
    .filter((l) => l[key] != null)
    .map((l) => ({ date: l.loggedAt, value: l[key] as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (points.length === 0) return null;
  const first = points[0].value;
  const latest = points[points.length - 1].value;
  return { key, points, first, latest, delta: round1(latest - first) };
}

function isStrengthWorkout(w: WorkoutEntry): boolean {
  if (w.type === 'gym' || w.type === 'home' || w.type === 'hiit') return true;
  return !!w.exercises && w.exercises.length > 0;
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

export interface TrainingImpact {
  windowDays: number;
  workoutCount: number;
  strengthCount: number;
  perWeek: number;
  text: string;
  positive: boolean | null;
}

/**
 * A grounded, deterministic narrative correlating training with body-composition
 * changes over the logged window. Returns null when there isn't enough history.
 */
export function trainingImpactInsight(
  logs: BodyCompositionEntry[],
  workouts: WorkoutEntry[],
  goal: GoalType = 'maintain',
): TrainingImpact | null {
  if (logs.length < 2) return null;
  const sorted = [...logs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const startIso = sorted[0].loggedAt;
  const nowIso = new Date().toISOString();
  const windowDays = Math.max(1, daysBetween(startIso, nowIso));

  const inWindow = workouts.filter((w) => w.performedAt >= startIso);
  const workoutCount = inWindow.length;
  const strengthCount = inWindow.filter(isStrengthWorkout).length;
  const perWeek = round1(workoutCount / Math.max(1, windowDays / 7));

  const fat = metricSeries(logs, 'bodyFatPct');
  const lean = metricSeries(logs, 'leanMassKg');
  const weight = metricSeries(logs, 'weightKg');

  const leanUp = lean ? lean.delta >= 0.3 : false;
  const leanDown = lean ? lean.delta <= -0.3 : false;
  const fatDown = fat ? fat.delta <= -0.5 : false;
  const fatUp = fat ? fat.delta >= 0.5 : false;

  const changes: string[] = [];
  if (fat && (fatDown || fatUp)) {
    changes.push(`${fatDown ? 'dropped' : 'gained'} ${Math.abs(fat.delta)} pts of body fat`);
  }
  if (lean && (leanUp || leanDown)) {
    changes.push(`${leanUp ? 'gained' : 'lost'} ${Math.abs(lean.delta)} kg lean mass`);
  }
  if (changes.length === 0 && weight && Math.abs(weight.delta) >= 0.5) {
    changes.push(`${weight.delta < 0 ? 'lost' : 'gained'} ${Math.abs(weight.delta)} kg bodyweight`);
  }

  const lostFatGoal = goal === 'lose_fat';
  const muscleGoal = goal === 'build_muscle' || goal === 'recomp';

  let positive: boolean | null = null;
  let verdict: string;
  if (leanUp && fatDown) {
    positive = true;
    verdict = "That's textbook body recomposition — your training and protein intake are clearly paying off.";
  } else if (fatDown && lostFatGoal) {
    positive = true;
    verdict = 'Your plan is steadily moving you toward your fat-loss goal.';
  } else if (leanUp && muscleGoal) {
    positive = true;
    verdict = 'Your resistance training is building muscle — keep the progressive overload going.';
  } else if (leanDown || (fatUp && lostFatGoal)) {
    positive = false;
    verdict =
      'Numbers ticked the wrong way recently — normal week to week. Anchor on consistent training, protein ≥1.6 g/kg, and 7–9 h sleep.';
  } else if (changes.length === 0) {
    positive = null;
    verdict =
      'Metrics are holding steady. Body composition changes are gradual — consistency over the next few weeks is what moves the needle.';
  } else {
    positive = fatDown || leanUp;
    verdict = 'Keep logging — a few more readings will sharpen the trend.';
  }

  const trainingPhrase =
    workoutCount > 0
      ? `you logged ${workoutCount} workout${workoutCount === 1 ? '' : 's'} (~${perWeek}/week${
          strengthCount > 0 ? `, ${strengthCount} with resistance training` : ''
        })`
      : "you haven't logged workouts yet";

  const changePhrase = changes.length ? ` and ${changes.join(' and ')}` : '';
  const text = `Over the last ${windowDays} days ${trainingPhrase}${changePhrase}. ${verdict}`;

  return { windowDays, workoutCount, strengthCount, perWeek, text, positive };
}
