import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

type Variant = 'display' | 'title' | 'heading' | 'subtitle' | 'body' | 'label' | 'caption';
type ColorKey = 'text' | 'textMuted' | 'textFaint' | 'brand' | 'onBrand' | 'danger' | 'success' | 'warning';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: ColorKey;
  weight?: keyof ReturnType<typeof useTheme>['fontWeight'];
  center?: boolean;
}

export function Text({ variant = 'body', color = 'text', weight, center, style, ...rest }: TextProps) {
  const theme = useTheme();

  const variantStyle: TextStyle = (() => {
    switch (variant) {
      case 'display':
        return { fontSize: theme.fontSize.display, fontWeight: theme.fontWeight.heavy as TextStyle['fontWeight'], letterSpacing: -0.5 };
      case 'title':
        return { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold as TextStyle['fontWeight'], letterSpacing: -0.4 };
      case 'heading':
        return { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold as TextStyle['fontWeight'], letterSpacing: -0.3 };
      case 'subtitle':
        return { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold as TextStyle['fontWeight'] };
      case 'label':
        return { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold as TextStyle['fontWeight'] };
      case 'caption':
        return { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.medium as TextStyle['fontWeight'] };
      case 'body':
      default:
        return { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.regular as TextStyle['fontWeight'] };
    }
  })();

  return (
    <RNText
      style={[
        variantStyle,
        { color: theme.colors[color] },
        weight ? { fontWeight: theme.fontWeight[weight] as TextStyle['fontWeight'] } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
      {...rest}
    />
  );
}
