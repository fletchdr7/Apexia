import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  unit?: string;
  color: string;
}

export function MacroBar({ label, value, target, unit = 'g', color }: MacroBarProps) {
  const theme = useTheme();
  const pct = target > 0 ? Math.min(1, value / target) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="label">{label}</Text>
        <Text variant="caption" color="textMuted">
          {Math.round(value)} / {Math.round(target)}
          {unit}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.cardMuted }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999 },
});
