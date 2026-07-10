import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Input, Text } from '@/components';
import { ACTIVITY_LIST, ACTIVITIES } from '@/constants/activities';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { Intensity, WorkoutType } from '@/types';
import { estimateCaloriesBurned } from '@/utils/nutrition';

const INTENSITIES: Intensity[] = ['easy', 'moderate', 'hard', 'max'];

export default function LogWorkout() {
  const theme = useTheme();
  const router = useRouter();
  const { addWorkout, profile, dateStamp } = useAppStore();

  const [type, setType] = useState<WorkoutType>('gym');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('45');
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [distance, setDistance] = useState('');

  const meta = ACTIVITIES[type];
  const weightKg = profile?.weightKg ?? 75;

  const intensityMet = useMemo(() => {
    const factor: Record<Intensity, number> = { easy: 0.8, moderate: 1, hard: 1.2, max: 1.4 };
    return meta.met * factor[intensity];
  }, [meta.met, intensity]);

  const estCalories = estimateCaloriesBurned(intensityMet, weightKg, Number(duration) || 0);

  const save = () => {
    addWorkout({
      type,
      title: title.trim() || meta.label,
      performedAt: dateStamp(),
      durationMin: Number(duration) || 0,
      intensity,
      caloriesBurned: estCalories,
      distanceKm: meta.tracksDistance && distance ? Number(distance) : undefined,
      source: 'manual',
    });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="heading">Log workout</Text>
        <Button label="Close" variant="ghost" onPress={() => router.back()} fullWidth={false} size="sm" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text variant="label" color="textMuted" style={{ marginBottom: 10 }}>
          Activity
        </Text>
        <View style={styles.chips}>
          {ACTIVITY_LIST.map((a) => (
            <Chip key={a.type} label={a.label} icon={a.icon} selected={type === a.type} onPress={() => setType(a.type)} />
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          <Input label="Title (optional)" placeholder={meta.label} value={title} onChangeText={setTitle} />
          <Input label="Duration" keyboardType="number-pad" value={duration} onChangeText={setDuration} suffix="min" />
          {meta.tracksDistance ? (
            <Input label="Distance (optional)" keyboardType="decimal-pad" value={distance} onChangeText={setDistance} suffix="km" />
          ) : null}
        </View>

        <Text variant="label" color="textMuted" style={{ marginTop: 4, marginBottom: 10 }}>
          Intensity
        </Text>
        <View style={styles.chips}>
          {INTENSITIES.map((i) => (
            <Chip key={i} label={i[0].toUpperCase() + i.slice(1)} selected={intensity === i} onPress={() => setIntensity(i)} />
          ))}
        </View>

        <Card style={{ marginTop: 20 }} muted>
          <View style={styles.estRow}>
            <Text color="textMuted">Estimated burn</Text>
            <Text variant="subtitle" color="brand">
              ~{estCalories} kcal
            </Text>
          </View>
          <Text variant="caption" color="textFaint" style={{ marginTop: 4 }}>
            Based on your weight and the activity. You can adjust later.
          </Text>
        </Card>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <Button label="Save workout" icon="checkmark" onPress={save} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  estRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
