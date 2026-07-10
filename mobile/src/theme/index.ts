import { createContext, useContext } from 'react';

import { darkColors, lightColors, palette, type ThemeColors } from './colors';
import { fontSize, fontWeight, radius, shadow, spacing } from './tokens';

export type Theme = {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  shadow: typeof shadow;
  palette: typeof palette;
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadow,
  palette,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadow,
  palette,
};

export const ThemeContext = createContext<Theme>(lightTheme);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export * from './colors';
export * from './tokens';
