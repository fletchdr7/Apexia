export function kgToLb(kg: number): number {
  return kg * 2.20462;
}
export function lbToKg(lb: number): number {
  return lb / 2.20462;
}
export function cmToInches(cm: number): number {
  return cm / 2.54;
}
export function inchesToCm(inches: number): number {
  return inches * 2.54;
}
export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalIn = Math.round(cmToInches(cm));
  return { ft: Math.floor(totalIn / 12), in: totalIn % 12 };
}
export function ftInToCm(ft: number, inch: number): number {
  return inchesToCm(ft * 12 + inch);
}
export function formatWeight(kg: number, units: 'metric' | 'imperial'): string {
  return units === 'metric' ? `${Math.round(kg)} kg` : `${Math.round(kgToLb(kg))} lb`;
}
export function formatHeight(cm: number, units: 'metric' | 'imperial'): string {
  if (units === 'metric') return `${Math.round(cm)} cm`;
  const { ft, in: inch } = cmToFtIn(cm);
  return `${ft}'${inch}"`;
}

export function unitLabel(units: 'metric' | 'imperial'): string {
  return units === 'imperial' ? 'lb' : 'kg';
}

/** Convert a canonical kg value to the user's display unit (rounded sensibly). */
export function kgToDisplay(kg: number, units: 'metric' | 'imperial'): number {
  return units === 'imperial' ? Math.round(kgToLb(kg)) : Math.round(kg * 2) / 2;
}

/** Convert a value entered in the user's display unit back to canonical kg. */
export function displayToKg(value: number, units: 'metric' | 'imperial'): number {
  return units === 'imperial' ? lbToKg(value) : value;
}

/**
 * Reformat a planned-weight string (canonical kg, e.g. "~20 kg") into the user's
 * unit. Non-numeric values like "bodyweight" or "moderate" pass through.
 */
export function formatPlannedWeight(suggested: string | undefined, units: 'metric' | 'imperial'): string {
  if (!suggested) return '';
  const m = suggested.match(/-?\d+(\.\d+)?/);
  if (!m) return suggested;
  return `~${kgToDisplay(Number(m[0]), units)} ${unitLabel(units)}`;
}
