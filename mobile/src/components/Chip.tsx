import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
}

export function Chip({ label, selected, onPress, icon }: ChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.brand : theme.colors.cardMuted,
          borderColor: selected ? theme.colors.brand : theme.colors.border,
          borderRadius: theme.radius.pill,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        {icon ? (
          <Ionicons
            name={icon}
            size={15}
            color={selected ? theme.colors.onBrand : theme.colors.textMuted}
            style={styles.icon}
          />
        ) : null}
        <Text
          variant="label"
          style={{ color: selected ? theme.colors.onBrand : theme.colors.text }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 6 },
});
