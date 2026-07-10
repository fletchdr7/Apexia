import type { WorkoutType } from '@/types';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface ActivityMeta {
  type: WorkoutType;
  label: string;
  icon: IoniconName;
  met: number; // moderate-intensity MET value for calorie estimates
  tracksDistance: boolean;
  tracksSets: boolean;
}

export const ACTIVITIES: Record<WorkoutType, ActivityMeta> = {
  gym: { type: 'gym', label: 'Gym / Weights', icon: 'barbell', met: 5, tracksDistance: false, tracksSets: true },
  home: { type: 'home', label: 'Home Workout', icon: 'home', met: 4.5, tracksDistance: false, tracksSets: true },
  run: { type: 'run', label: 'Run', icon: 'walk', met: 9.8, tracksDistance: true, tracksSets: false },
  cycling: { type: 'cycling', label: 'Cycling', icon: 'bicycle', met: 7.5, tracksDistance: true, tracksSets: false },
  reformer_pilates: {
    type: 'reformer_pilates',
    label: 'Reformer Pilates',
    icon: 'body',
    met: 3.5,
    tracksDistance: false,
    tracksSets: false,
  },
  yoga: { type: 'yoga', label: 'Yoga', icon: 'flower', met: 3, tracksDistance: false, tracksSets: false },
  swim: { type: 'swim', label: 'Swim', icon: 'water', met: 8, tracksDistance: true, tracksSets: false },
  hiit: { type: 'hiit', label: 'HIIT', icon: 'flash', met: 8, tracksDistance: false, tracksSets: true },
  walk: { type: 'walk', label: 'Walk', icon: 'footsteps', met: 3.5, tracksDistance: true, tracksSets: false },
  sport: { type: 'sport', label: 'Sport', icon: 'football', met: 7, tracksDistance: false, tracksSets: false },
  mobility: { type: 'mobility', label: 'Mobility', icon: 'accessibility', met: 2.5, tracksDistance: false, tracksSets: false },
};

export const ACTIVITY_LIST: ActivityMeta[] = Object.values(ACTIVITIES);
