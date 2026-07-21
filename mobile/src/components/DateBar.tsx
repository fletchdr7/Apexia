import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { addDaysKey, dayBarLabel, isTodayKey, todayKey } from '@/utils/date';
import { Text } from './Text';

interface DateBarProps {
  date: string;
  onChange: (dateKey: string) => void;
}

export function DateBar({ date, onChange }: DateBarProps) {
  const theme = useTheme();
  const atToday = isTodayKey(date);

  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Pressable onPress={() => onChange(addDaysKey(date, -1))} hitSlop={8} style={styles.arrow}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
      </Pressable>

      <Pressable onPress={() => onChange(todayKey())} style={styles.center} hitSlop={8}>
        <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
        <Text variant="label">{dayBarLabel(date)}</Text>
      </Pressable>

      <Pressable
        onPress={() => !atToday && onChange(addDaysKey(date, 1))}
        hitSlop={8}
        disabled={atToday}
        style={[styles.arrow, { opacity: atToday ? 0.3 : 1 }]}
      >
        <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 6,
    height: 48,
  },
  arrow: { padding: 8 },
  center: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
});
