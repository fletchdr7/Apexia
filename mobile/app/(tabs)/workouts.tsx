import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, DateBar, EmptyState, Screen, SectionHeader, StatTile, Text } from '@/components';
import { ACTIVITIES } from '@/constants/activities';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import { isSameDay, relativeDay, timeLabel } from '@/utils/date';

export default function Workouts() {
  const theme = useTheme();
  const router = useRouter();
  const { workouts, profile, removeWorkout, gymEquipmentIds, homeEquipmentIds, selectedDate, setSelectedDate } =
    useAppStore();

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const thisWeek = workouts.filter((w) => new Date(w.performedAt) >= weekStart);
  const weekCount = thisWeek.length;
  const weekMinutes = thisWeek.reduce((sum, w) => sum + w.durationMin, 0);
  const weekCalories = thisWeek.reduce((sum, w) => sum + (w.caloriesBurned ?? 0), 0);
  const target = profile?.weeklyWorkoutTarget ?? 4;

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title">Training</Text>
        <Button label="Log" icon="add" onPress={() => router.push('/workout/log')} fullWidth={false} size="sm" />
      </View>

      <View style={{ marginTop: 8 }}>
        <DateBar date={selectedDate} onChange={setSelectedDate} />
        <Text variant="caption" color="textFaint" style={{ marginTop: 6, textAlign: 'center' }}>
          New workouts are logged to this day
        </Text>
      </View>

      <Card onPress={() => router.push('/workout/plan')} style={{ marginTop: 12 }}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: theme.colors.brand }]}>
            <Ionicons name="sparkles" size={22} color={theme.colors.onBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label">Build a workout</Text>
            <Text variant="caption" color="textMuted">
              AI plan from your equipment, time & goal
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textFaint} />
        </View>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textMuted">
              This week
            </Text>
            <Text variant="title">
              {weekCount}
              <Text color="textFaint"> / {target} workouts</Text>
            </Text>
          </View>
          <View style={styles.weekDots}>
            {Array.from({ length: target }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i < weekCount ? theme.colors.brand : theme.colors.cardMuted },
                ]}
              />
            ))}
          </View>
        </View>
      </Card>

      <View style={styles.statsRow}>
        <StatTile icon="time" label="Minutes" value={`${weekMinutes}`} tint={theme.colors.protein} />
        <View style={{ width: 12 }} />
        <StatTile icon="flame" label="Calories" value={`${weekCalories}`} tint={theme.colors.fat} />
      </View>

      <SectionHeader title="Equipment" actionLabel="Manage" onAction={() => router.push('/equipment')} />
      <Card onPress={() => router.push('/equipment')}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: theme.colors.brandSoft }]}>
            <Ionicons name="barbell" size={22} color={theme.colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label">My equipment</Text>
            <Text variant="caption" color="textMuted">
              {gymEquipmentIds.length + homeEquipmentIds.length > 0
                ? `Gym ${gymEquipmentIds.length} · Home ${homeEquipmentIds.length} · scan to add more`
                : 'Select what you have, or scan gym equipment to add it'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textFaint} />
        </View>
      </Card>

      <SectionHeader title="History" />
      {workouts.length === 0 ? (
        <EmptyState
          icon="barbell"
          title="No workouts yet"
          message="Log your first session — gym, run, cycling, reformer pilates, or anything else."
          actionLabel="Log a workout"
          onAction={() => router.push('/workout/log')}
        />
      ) : (
        workouts.map((w) => {
          const meta = ACTIVITIES[w.type];
          return (
            <Card key={w.id} style={{ marginBottom: 10 }}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: theme.colors.brandSoft }]}>
                  <Ionicons name={meta.icon} size={22} color={theme.colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label">{w.title}</Text>
                  <Text variant="caption" color="textMuted">
                    {meta.label} · {w.durationMin} min · {w.intensity}
                    {w.distanceKm ? ` · ${w.distanceKm} km` : ''}
                  </Text>
                  <Text variant="caption" color="textFaint" style={{ marginTop: 2 }}>
                    {isSameDay(w.performedAt) ? `Today ${timeLabel(w.performedAt)}` : relativeDay(w.performedAt)}
                    {w.caloriesBurned ? ` · ${w.caloriesBurned} kcal` : ''}
                  </Text>
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    Alert.alert('Delete workout', `Delete ${w.title}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => removeWorkout(w.id) },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.textFaint} />
                </Pressable>
              </View>
              {w.exercises && w.exercises.length > 0 ? (
                <View style={[styles.exBox, { borderTopColor: theme.colors.border }]}>
                  {w.exercises.map((ex, i) => (
                    <Text key={i} variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                      {ex.name}: {ex.sets.map((s) => `${s.reps}${s.weightKg ? `×${s.weightKg}kg` : ''}`).join(', ')}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center' },
  statsRow: { flexDirection: 'row', marginTop: 12 },
  weekDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exBox: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
