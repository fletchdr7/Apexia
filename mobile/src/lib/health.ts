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

const round1 = (n: number) => Math.round(n * 10) / 10;

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
