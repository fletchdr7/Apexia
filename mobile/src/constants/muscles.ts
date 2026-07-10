export const MUSCLE_GROUPS = [
  { id: 'full_body', label: 'Full body' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core' },
] as const;

export type MuscleGroupId = (typeof MUSCLE_GROUPS)[number]['id'];

export function muscleLabel(id: string): string {
  return MUSCLE_GROUPS.find((m) => m.id === id)?.label ?? id;
}
