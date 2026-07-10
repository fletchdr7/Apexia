/**
 * Apexia color system.
 *
 * The palette is intentionally calm and professional with an energetic emerald
 * brand accent. Macro colors are consistent across the whole app so users learn
 * "indigo = protein, amber = carbs, coral = fat" at a glance.
 */

export const palette = {
  // Brand
  emerald50: '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald400: '#34D399',
  emerald500: '#10B981',
  emerald600: '#059669',
  emerald700: '#047857',

  indigo100: '#E0E7FF',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',

  amber100: '#FEF3C7',
  amber500: '#F59E0B',

  coral100: '#FFE4E6',
  coral400: '#FB7185',
  coral500: '#F43F5E',

  sky500: '#0EA5E9',
  violet500: '#8B5CF6',

  // Neutrals (slate)
  white: '#FFFFFF',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',

  black: '#000000',
  transparent: 'transparent',
} as const;

export type ThemeColors = {
  background: string;
  backgroundElevated: string;
  card: string;
  cardMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  textInverse: string;

  brand: string;
  brandDark: string;
  brandSoft: string;
  onBrand: string;

  // Semantic
  success: string;
  warning: string;
  danger: string;
  info: string;

  // Macro accents
  calories: string;
  protein: string;
  carbs: string;
  fat: string;

  overlay: string;
};

export const lightColors: ThemeColors = {
  background: palette.slate50,
  backgroundElevated: palette.white,
  card: palette.white,
  cardMuted: palette.slate100,
  border: palette.slate200,
  text: palette.slate900,
  textMuted: palette.slate500,
  textFaint: palette.slate400,
  textInverse: palette.white,

  brand: palette.emerald500,
  brandDark: palette.emerald600,
  brandSoft: palette.emerald50,
  onBrand: palette.white,

  success: palette.emerald500,
  warning: palette.amber500,
  danger: palette.coral500,
  info: palette.sky500,

  calories: palette.emerald500,
  protein: palette.indigo500,
  carbs: palette.amber500,
  fat: palette.coral400,

  overlay: 'rgba(15, 23, 42, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#0B1120',
  backgroundElevated: '#0F1A2E',
  card: '#131C2E',
  cardMuted: '#1B2740',
  border: '#25324B',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textFaint: '#64748B',
  textInverse: '#0F172A',

  brand: palette.emerald400,
  brandDark: palette.emerald600,
  brandSoft: 'rgba(52, 211, 153, 0.12)',
  onBrand: '#062B22',

  success: palette.emerald400,
  warning: palette.amber500,
  danger: palette.coral400,
  info: palette.sky500,

  calories: palette.emerald400,
  protein: '#818CF8',
  carbs: palette.amber500,
  fat: palette.coral400,

  overlay: 'rgba(2, 6, 23, 0.6)',
};
