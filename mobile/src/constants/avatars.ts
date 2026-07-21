import type { ImageSourcePropType } from 'react-native';

export interface CoachAvatar {
  id: string;
  label: string;
  gender: 'female' | 'male';
  source: ImageSourcePropType;
}

export const COACH_AVATARS: CoachAvatar[] = [
  { id: 'fem-1', label: 'Maya', gender: 'female', source: require('../../assets/avatars/coach-fem-1.png') },
  { id: 'fem-2', label: 'Simone', gender: 'female', source: require('../../assets/avatars/coach-fem-2.png') },
  { id: 'male-1', label: 'Jordan', gender: 'male', source: require('../../assets/avatars/coach-male-1.png') },
  { id: 'male-2', label: 'Kai', gender: 'male', source: require('../../assets/avatars/coach-male-2.png') },
];

export function getCoachAvatar(id?: string): CoachAvatar | null {
  if (!id) return null;
  return COACH_AVATARS.find((a) => a.id === id) ?? null;
}
