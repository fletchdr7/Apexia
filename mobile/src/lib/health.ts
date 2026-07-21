import { Platform } from 'react-native';
import type * as HKType from '@kingstinct/react-native-healthkit';

/**
 * Thin, defensive wrapper around Apple HealthKit.
 *
 * HealthKit is native and iOS-only. The library is lazily required so nothing
 * breaks on other platforms, and every call is guarded — if Health is
 * unavailable or permission is denied, functions resolve to empty/undefined.
 */

type HK = typeof HKType;
let cached: HK | null | undefined;

function hk(): HK | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'ios') {
    cached = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('@kingstinct/react-native-healthkit') as HK;
  } catch {
    cached = null;
  }
  return cached;
}

const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierLeanBodyMass',
  'HKQuantityTypeIdentifierBodyMassIndex',
] as const;

export interface HealthSnapshot {
  steps?: number;
  activeEnergyKcal?: number;
}

export interface BodyComposition {
  weightKg?: number;
  bodyFatPct?: number;
  leanMassKg?: number;
  bmi?: number;
}

export interface BodyCompositionSample extends BodyComposition {
  /** ISO timestamp of the reading. */
  date: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Local YYYY-MM-DD key for a Date (device timezone). */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isHealthAvailable(): boolean {
  const lib = hk();
  try {
    return !!lib && lib.isHealthDataAvailable();
  } catch {
    return false;
  }
}

export async function requestHealthPermissions(): Promise<boolean> {
  const lib = hk();
  if (!lib) return false;
  try {
    return await lib.requestAuthorization({ toShare: [], toRead: READ_TYPES });
  } catch {
    return false;
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getTodayHealth(): Promise<HealthSnapshot> {
  const lib = hk();
  if (!lib || !isHealthAvailable()) return {};
  const filter = { date: { startDate: startOfToday(), endDate: new Date() } };
  const out: HealthSnapshot = {};
  try {
    const steps = await lib.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
      filter,
      unit: 'count',
    });
    if (steps.sumQuantity) out.steps = Math.round(steps.sumQuantity.quantity);
  } catch {
    // ignore
  }
  try {
    const energy = await lib.queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], {
      filter,
      unit: 'kcal',
    });
    if (energy.sumQuantity) out.activeEnergyKcal = Math.round(energy.sumQuantity.quantity);
  } catch {
    // ignore
  }
  return out;
}

export async function getLatestBodyMassKg(): Promise<number | undefined> {
  const lib = hk();
  if (!lib || !isHealthAvailable()) return undefined;
  try {
    const sample = await lib.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg');
    return sample ? round1(sample.quantity) : undefined;
  } catch {
    return undefined;
  }
}

/** Latest body composition (weight, body fat %, lean mass, BMI) from Apple Health. */
export async function getLatestBodyComposition(): Promise<BodyComposition> {
  const lib = hk();
  if (!lib || !isHealthAvailable()) return {};
  const out: BodyComposition = {};
  try {
    const s = await lib.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg');
    if (s) out.weightKg = round1(s.quantity);
  } catch {
    // ignore
  }
  try {
    const s = await lib.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', '%');
    // HealthKit percent unit is a fraction (0.18 = 18%); normalize to a 0-100 number.
    if (s) out.bodyFatPct = round1(s.quantity <= 1 ? s.quantity * 100 : s.quantity);
  } catch {
    // ignore
  }
  try {
    const s = await lib.getMostRecentQuantitySample('HKQuantityTypeIdentifierLeanBodyMass', 'kg');
    if (s) out.leanMassKg = round1(s.quantity);
  } catch {
    // ignore
  }
  try {
    const s = await lib.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMassIndex', 'count');
    if (s) out.bmi = round1(s.quantity);
  } catch {
    // ignore
  }
  return out;
}

/**
 * Historical body-composition readings from Apple Health over the last `days`,
 * merged into one entry per calendar day (keeping the latest reading of each
 * metric that day). Used to backfill trends from a smart scale.
 */
export async function getBodyCompositionSeries(days = 180): Promise<BodyCompositionSample[]> {
  const lib = hk();
  if (!lib || !isHealthAvailable()) return [];
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  const filter = { date: { startDate, endDate } };

  // Per day: metric value + the timestamp of the latest sample contributing to it.
  const byDay = new Map<string, BodyCompositionSample & { _ts: number }>();

  const collect = async (
    identifier: Parameters<typeof lib.queryQuantitySamples>[0],
    unit: string,
    assign: (entry: BodyCompositionSample, value: number) => void,
  ) => {
    try {
      const samples = await lib.queryQuantitySamples(identifier as never, {
        filter,
        unit: unit as never,
        limit: 0,
        ascending: true,
      });
      for (const s of samples) {
        const when = (s.endDate ?? s.startDate) as Date;
        const key = localDayKey(when);
        const ts = when.getTime();
        const existing = byDay.get(key) ?? { date: when.toISOString(), _ts: ts };
        // Keep the most recent reading of the day as the representative timestamp.
        if (ts >= existing._ts) {
          existing._ts = ts;
          existing.date = when.toISOString();
        }
        assign(existing, s.quantity);
        byDay.set(key, existing);
      }
    } catch {
      // ignore missing type / permission
    }
  };

  await collect('HKQuantityTypeIdentifierBodyMass', 'kg', (e, v) => {
    e.weightKg = round1(v);
  });
  await collect('HKQuantityTypeIdentifierBodyFatPercentage', '%', (e, v) => {
    e.bodyFatPct = round1(v <= 1 ? v * 100 : v);
  });
  await collect('HKQuantityTypeIdentifierLeanBodyMass', 'kg', (e, v) => {
    e.leanMassKg = round1(v);
  });
  await collect('HKQuantityTypeIdentifierBodyMassIndex', 'count', (e, v) => {
    e.bmi = round1(v);
  });

  return Array.from(byDay.values())
    .map(({ _ts, ...rest }) => rest)
    .filter((e) => e.weightKg != null || e.bodyFatPct != null || e.leanMassKg != null || e.bmi != null)
    .sort((a, b) => a.date.localeCompare(b.date));
}
