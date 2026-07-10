import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: ComponentProps<typeof Ionicons>['name'];
  iconRight?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth = true,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const height = size === 'sm' ? 40 : size === 'lg' ? 56 : 50;
  const fontSize = size === 'sm' ? theme.fontSize.sm : theme.fontSize.md;

  const bg: Record<Variant, string> = {
    primary: theme.colors.brand,
    secondary: theme.colors.cardMuted,
    ghost: 'transparent',
    danger: theme.colors.danger,
  };
  const fg: Record<Variant, string> = {
    primary: theme.colors.onBrand,
    secondary: theme.colors.text,
    ghost: theme.colors.brand,
    danger: theme.colors.textInverse,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: bg[variant],
          borderRadius: theme.radius.md,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? theme.spacing.lg : theme.spacing.xl,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={fontSize + 3} color={fg[variant]} style={styles.iconLeft} /> : null}
          <Text style={{ color: fg[variant], fontSize, fontWeight: theme.fontWeight.semibold as never }}>{label}</Text>
          {iconRight ? <Ionicons name={iconRight} size={fontSize + 3} color={fg[variant]} style={styles.iconRight} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});
