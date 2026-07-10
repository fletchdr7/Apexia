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
