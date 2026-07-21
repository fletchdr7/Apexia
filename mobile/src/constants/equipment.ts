import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { Equipment, EquipmentCategory } from '@/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const EQUIPMENT_CATEGORIES: Record<EquipmentCategory, { label: string; icon: IoniconName }> = {
  free_weights: { label: 'Free weights', icon: 'barbell' },
  machine: { label: 'Machines', icon: 'construct' },
  cable: { label: 'Cable', icon: 'git-network' },
  cardio: { label: 'Cardio', icon: 'heart' },
  bodyweight: { label: 'Bodyweight', icon: 'body' },
  accessory: { label: 'Accessories', icon: 'fitness' },
  other: { label: 'Other', icon: 'ellipsis-horizontal' },
};

/** Built-in catalog of common equipment. Stable ids so selection persists. */
export const EQUIPMENT_CATALOG: Equipment[] = [
  { id: 'eq_barbell', name: 'Barbell', category: 'free_weights', primaryMuscles: ['Full body'], source: 'catalog', exampleExercises: ['Back squat', 'Deadlift', 'Bench press'] },
  { id: 'eq_dumbbells', name: 'Dumbbells', category: 'free_weights', primaryMuscles: ['Full body'], source: 'catalog', exampleExercises: ['Goblet squat', 'DB press', 'Rows'] },
  { id: 'eq_kettlebell', name: 'Kettlebell', category: 'free_weights', primaryMuscles: ['Posterior chain', 'Core'], source: 'catalog', exampleExercises: ['Swing', 'Goblet squat', 'Turkish get-up'] },
  { id: 'eq_ez_bar', name: 'EZ Curl Bar', category: 'free_weights', primaryMuscles: ['Biceps', 'Triceps'], source: 'catalog', exampleExercises: ['Curl', 'Skull crusher'] },
  { id: 'eq_bench', name: 'Adjustable Bench', category: 'free_weights', primaryMuscles: ['Chest', 'Shoulders'], source: 'catalog', exampleExercises: ['Bench press', 'Incline press'] },
  { id: 'eq_squat_rack', name: 'Squat Rack', category: 'free_weights', primaryMuscles: ['Legs', 'Back'], source: 'catalog', exampleExercises: ['Squat', 'Rack pull'] },
  { id: 'eq_smith', name: 'Smith Machine', category: 'machine', primaryMuscles: ['Legs', 'Chest'], source: 'catalog', exampleExercises: ['Smith squat', 'Smith press'] },
  { id: 'eq_leg_press', name: 'Leg Press', category: 'machine', primaryMuscles: ['Quads', 'Glutes'], source: 'catalog', exampleExercises: ['Leg press', 'Calf press'] },
  { id: 'eq_leg_curl', name: 'Leg Curl Machine', category: 'machine', primaryMuscles: ['Hamstrings'], source: 'catalog', exampleExercises: ['Lying leg curl', 'Seated leg curl'] },
  { id: 'eq_leg_ext', name: 'Leg Extension Machine', category: 'machine', primaryMuscles: ['Quads'], source: 'catalog', exampleExercises: ['Leg extension'] },
  { id: 'eq_chest_press', name: 'Chest Press Machine', category: 'machine', primaryMuscles: ['Chest'], source: 'catalog', exampleExercises: ['Machine chest press'] },
  { id: 'eq_lat_pulldown', name: 'Lat Pulldown', category: 'cable', primaryMuscles: ['Back', 'Biceps'], source: 'catalog', exampleExercises: ['Lat pulldown', 'Straight-arm pulldown'] },
  { id: 'eq_cable', name: 'Cable Machine', category: 'cable', primaryMuscles: ['Full body'], source: 'catalog', exampleExercises: ['Cable row', 'Triceps pushdown', 'Face pull'] },
  { id: 'eq_treadmill', name: 'Treadmill', category: 'cardio', primaryMuscles: ['Cardio'], source: 'catalog', exampleExercises: ['Run', 'Incline walk'] },
  { id: 'eq_rower', name: 'Rowing Machine', category: 'cardio', primaryMuscles: ['Full body', 'Cardio'], source: 'catalog', exampleExercises: ['Row intervals'] },
  { id: 'eq_bike', name: 'Stationary Bike', category: 'cardio', primaryMuscles: ['Legs', 'Cardio'], source: 'catalog', exampleExercises: ['Steady ride', 'Sprints'] },
  { id: 'eq_elliptical', name: 'Elliptical', category: 'cardio', primaryMuscles: ['Cardio'], source: 'catalog', exampleExercises: ['Steady state'] },
  { id: 'eq_pullup', name: 'Pull-up Bar', category: 'bodyweight', primaryMuscles: ['Back', 'Biceps'], source: 'catalog', exampleExercises: ['Pull-up', 'Hanging leg raise'] },
  { id: 'eq_dip', name: 'Dip Station', category: 'bodyweight', primaryMuscles: ['Chest', 'Triceps'], source: 'catalog', exampleExercises: ['Dip', 'Leg raise'] },
  { id: 'eq_bands', name: 'Resistance Bands', category: 'accessory', primaryMuscles: ['Full body'], source: 'catalog', exampleExercises: ['Band pull-apart', 'Banded squat'] },
  { id: 'eq_trx', name: 'Suspension Trainer', category: 'accessory', primaryMuscles: ['Full body', 'Core'], source: 'catalog', exampleExercises: ['TRX row', 'TRX press'] },
  { id: 'eq_medball', name: 'Medicine Ball', category: 'accessory', primaryMuscles: ['Core'], source: 'catalog', exampleExercises: ['Slam', 'Russian twist'] },
  { id: 'eq_jumprope', name: 'Jump Rope', category: 'accessory', primaryMuscles: ['Cardio', 'Calves'], source: 'catalog', exampleExercises: ['Skipping intervals'] },
];

/**
 * Maps a catalog equipment id to the equipment tags used by the exercise library,
 * so workout generation only picks exercises you can actually do.
 */
export const LIBRARY_EQUIPMENT_BY_ID: Record<string, string[]> = {
  eq_barbell: ['barbell'],
  eq_dumbbells: ['dumbbell'],
  eq_kettlebell: ['kettlebell'],
  eq_ez_bar: ['e-z curl bar', 'barbell'],
  eq_bench: [],
  eq_squat_rack: ['barbell'],
  eq_smith: ['machine'],
  eq_leg_press: ['machine'],
  eq_leg_curl: ['machine'],
  eq_leg_ext: ['machine'],
  eq_chest_press: ['machine'],
  eq_lat_pulldown: ['cable', 'machine'],
  eq_cable: ['cable'],
  eq_treadmill: [],
  eq_rower: ['machine'],
  eq_bike: ['machine'],
  eq_elliptical: ['machine'],
  eq_pullup: ['body only'],
  eq_dip: ['body only'],
  eq_bands: ['bands'],
  eq_trx: ['body only', 'other'],
  eq_medball: ['medicine ball'],
  eq_jumprope: ['other'],
};

/** Fallback mapping for scanned/custom equipment, by category. */
export const LIBRARY_EQUIPMENT_BY_CATEGORY: Record<EquipmentCategory, string[]> = {
  free_weights: ['barbell', 'dumbbell', 'kettlebell'],
  machine: ['machine'],
  cable: ['cable'],
  cardio: ['machine'],
  bodyweight: ['body only'],
  accessory: ['bands', 'medicine ball', 'exercise ball', 'other'],
  other: ['other'],
};
