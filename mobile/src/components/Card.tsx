import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
  muted?: boolean;
  elevated?: boolean;
}

export function Card({ children, onPress, style, padded = true, muted, elevated = true }: CardProps) {
  const theme = useTheme();

  const base: ViewStyle = {
    backgroundColor: muted ? theme.colors.cardMuted : theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: padded ? theme.spacing.lg : 0,
    borderWidth: theme.mode === 'dark' ? 1 : 0,
    borderColor: theme.colors.border,
    ...(elevated && theme.mode === 'light' ? theme.shadow.card : {}),
  };

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }

  return <View style={[base, style]}>{children}</View>;
}
