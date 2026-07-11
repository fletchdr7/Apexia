export interface ExerciseMedia {
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  level: string | null;
  instructions: string[];
  images: string[];
}

// require avoids TS inferring a huge literal type from the ~900KB JSON.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LIB = require('../data/exerciseLibrary.json') as ExerciseMedia[];

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set([
  'the', 'a', 'with', 'and', 'of', 'to', 'on', 'or', 'for',
  'machine', 'barbell', 'dumbbell', 'db', 'cable', 'ez', 'bar', 'grip',
  'medium', 'wide', 'close', 'seated', 'standing', 'lying', 'incline', 'decline',
  'variation', 'alternate', 'alternating', 'single', 'double', 'weighted', 'bodyweight',
]);

function tokens(s: string): string[] {
  return norm(s).split(' ').filter((t) => t.length > 1 && !STOP.has(t));
}

const exact = new Map<string, ExerciseMedia>();
const indexed = LIB.map((e) => {
  const key = norm(e.name);
  if (!exact.has(key)) exact.set(key, e);
  return { e, toks: tokens(e.name), key };
});

const cache = new Map<string, ExerciseMedia | null>();

/** Best-effort match of a free-form exercise name to a library entry. */
export function findExerciseMedia(name: string): ExerciseMedia | null {
  if (!name) return null;
  if (cache.has(name)) return cache.get(name) ?? null;

  const key = norm(name);
  const direct = exact.get(key);
  if (direct) {
    cache.set(name, direct);
    return direct;
  }

  const q = tokens(name);
  if (q.length === 0) {
    cache.set(name, null);
    return null;
  }

  let best: ExerciseMedia | null = null;
  let bestScore = 0;
  for (const { e, toks, key: lkey } of indexed) {
    let matched = 0;
    for (const t of q) if (toks.includes(t)) matched += 1;
    if (matched === 0) continue;
    // coverage of the query + a bonus when the library name contains the whole query
    let score = matched / q.length + matched / (toks.length + 1);
    if (lkey.includes(key) || key.includes(lkey)) score += 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }

  // Require at least half the meaningful query tokens to match.
  const result = bestScore >= 0.5 ? best : null;
  cache.set(name, result);
  return result;
}
