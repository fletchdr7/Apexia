import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Card } from './Card';
import { Text } from './Text';

interface StatTileProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  sub?: string;
  tint?: string;
  onPress?: () => void;
}

export function StatTile({ icon, label, value, sub, tint, onPress }: StatTileProps) {
  const theme = useTheme();
  const color = tint ?? theme.colors.brand;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text variant="title" style={styles.value}>
        {value}
      </Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      {sub ? (
        <Text variant="caption" color="textFaint" style={styles.sub}>
          {sub}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: { marginBottom: 2 },
  sub: { marginTop: 2 },
});
