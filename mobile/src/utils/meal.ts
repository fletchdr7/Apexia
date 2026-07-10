import type { MealSlot } from '@/types';

export function defaultSlotForNow(d: Date = new Date()): MealSlot {
  const h = d.getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}
