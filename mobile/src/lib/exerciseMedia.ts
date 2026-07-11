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

  // Strict: every meaningful query token must appear in the candidate name.
  // Among those, prefer the closest (fewest extra tokens). Avoids wrong matches
  // like "tricep extension" -> "leg extension".
  let best: ExerciseMedia | null = null;
  let bestExtra = Infinity;
  for (const { e, toks } of indexed) {
    let matched = 0;
    for (const t of q) if (toks.includes(t)) matched += 1;
    if (matched !== q.length) continue;
    const extra = toks.length - matched;
    if (extra < bestExtra) {
      bestExtra = extra;
      best = e;
    }
  }

  cache.set(name, best);
  return best;
}

const MUSCLE_GROUP_TO_LIBRARY: Record<string, string[]> = {
  chest: ['chest'],
  back: ['lats', 'middle back', 'lower back', 'traps'],
  legs: ['quadriceps', 'hamstrings', 'calves', 'abductors', 'adductors'],
  glutes: ['glutes'],
  shoulders: ['shoulders'],
  arms: ['biceps', 'triceps', 'forearms'],
  core: ['abdominals'],
};

const ALL_GROUPS = Object.keys(MUSCLE_GROUP_TO_LIBRARY);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function canUseEquipment(e: ExerciseMedia, available: Set<string>): boolean {
  return !e.equipment || e.equipment === 'body only' || available.has(e.equipment);
}

/**
 * Pick exercises directly from the library, filtered by target muscle groups and
 * available equipment, spread round-robin across the chosen groups. Because these
 * are real library entries, each one always has a correct demo + instructions.
 */
export function selectLibraryExercises(
  muscleGroups: string[],
  available: Set<string>,
  count: number,
): ExerciseMedia[] {
  const groups = !muscleGroups.length || muscleGroups.includes('full_body') ? ALL_GROUPS : muscleGroups;
  const pools = groups.map((g) => {
    const libs = MUSCLE_GROUP_TO_LIBRARY[g] ?? [];
    return shuffle(
      LIB.filter((e) => e.images.length > 0 && canUseEquipment(e, available) && e.primaryMuscles.some((m) => libs.includes(m))),
    );
  });

  const chosen: ExerciseMedia[] = [];
  const seen = new Set<string>();
  const ptr = pools.map(() => 0);
  let active = true;
  while (chosen.length < count && active) {
    active = false;
    for (let i = 0; i < pools.length && chosen.length < count; i++) {
      const pool = pools[i];
      while (ptr[i] < pool.length && seen.has(pool[ptr[i]].name)) ptr[i] += 1;
      if (ptr[i] < pool.length) {
        const e = pool[ptr[i]];
        ptr[i] += 1;
        seen.add(e.name);
        chosen.push(e);
        active = true;
      }
    }
  }
  return chosen;
}

export const BROWSE_GROUPS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core' },
];

/** Browse the whole library, filtered by muscle group, search text, and equipment. */
export function browseLibrary(opts: { group: string; query?: string; available?: Set<string> }): ExerciseMedia[] {
  const libs = opts.group === 'all' || opts.group === 'full_body' ? null : MUSCLE_GROUP_TO_LIBRARY[opts.group] ?? [];
  const q = (opts.query ?? '').trim().toLowerCase();
  let list = LIB.filter((e) => e.images.length > 0);
  if (libs) list = list.filter((e) => e.primaryMuscles.some((m) => libs.includes(m)));
  if (opts.available) list = list.filter((e) => canUseEquipment(e, opts.available!));
  if (q) list = list.filter((e) => e.name.toLowerCase().includes(q));
  return list.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 120);
}

/** Alternative library exercises for the same muscle(s), for the swap feature. */
export function swapCandidates(
  muscles: string[],
  available: Set<string>,
  excludeName: string,
  count = 6,
): ExerciseMedia[] {
  const target = muscles.map((m) => m.toLowerCase());
  const ex = excludeName.toLowerCase();
  const pool = LIB.filter(
    (e) =>
      e.name.toLowerCase() !== ex &&
      e.images.length > 0 &&
      canUseEquipment(e, available) &&
      (target.length === 0 || e.primaryMuscles.some((m) => target.includes(m.toLowerCase()))),
  );
  return shuffle(pool).slice(0, count);
}
