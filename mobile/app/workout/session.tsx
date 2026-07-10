import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components';
import { ACTIVITIES } from '@/constants/activities';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { PlannedExercise, StrengthExercise } from '@/types';
import { estimateCaloriesBurned } from '@/utils/nutrition';
import { displayToKg, unitLabel } from '@/utils/units';

interface SetRow {
  reps: string;
  weight: string;
  done: boolean;
}

function firstNumber(s?: string): string {
  if (!s) return '';
  const m = s.match(/\d+(\.\d+)?/);
  return m ? m[0] : '';
}

function initSets(ex: PlannedExercise): SetRow[] {
  const reps = firstNumber(ex.reps) || '10';
  const weight = firstNumber(ex.suggestedWeight);
  return Array.from({ length: Math.max(1, ex.sets) }, () => ({ reps, weight, done: false }));
}

export default function WorkoutSession() {
  const theme = useTheme();
  const router = useRouter();
  const { activePlan, setActivePlan, addWorkout, profile } = useAppStore();

  const [idx, setIdx] = useState(0);
  const [sets, setSets] = useState<SetRow[]>(() => (activePlan ? initSets(activePlan.exercises[0]) : []));
  const [phase, setPhase] = useState<'logging' | 'confirm' | 'finished'>('logging');
  const [completed, setCompleted] = useState<StrengthExercise[]>([]);
  const [rest, setRest] = useState<number | null>(null);

  useEffect(() => {
    if (rest === null) return;
    if (rest <= 0) {
      setRest(null);
      return;
    }
    const t = setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [rest]);

  if (!activePlan) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text color="textMuted">No active workout.</Text>
        <Button label="Back" variant="ghost" fullWidth={false} onPress={() => router.back()} style={{ marginTop: 12 }} />
      </SafeAreaView>
    );
  }

  const plan = activePlan;
  const units = profile?.units ?? 'imperial';
  const total = plan.exercises.length;
  const ex = plan.exercises[idx];
  const restBetween = ex.restSec ?? 60;

  const updateSet = (k: number, patch: Partial<SetRow>) =>
    setSets((prev) => prev.map((s, i) => (i === k ? { ...s, ...patch } : s)));

  const markDone = (k: number) => {
    updateSet(k, { done: true });
    const remaining = sets.filter((s, i) => i !== k && !s.done).length;
    if (remaining > 0) setRest(restBetween);
  };

  const addSet = () =>
    setSets((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, { reps: last?.reps ?? '10', weight: last?.weight ?? '', done: false }];
    });

  const toStrength = (): StrengthExercise => ({
    name: ex.name,
    sets: sets.map((s) => ({
      reps: Number(s.reps) || 0,
      weightKg: s.weight ? Math.round(displayToKg(Number(s.weight), units) * 100) / 100 : undefined,
    })),
  });

  const finishWorkout = (all: StrengthExercise[]) => {
    const weightKg = profile?.weightKg ?? 75;
    const met = ACTIVITIES[plan.location].met;
    addWorkout({
      type: plan.location,
      title: plan.title,
      performedAt: new Date().toISOString(),
      durationMin: plan.durationMin,
      intensity: 'moderate',
      caloriesBurned: estimateCaloriesBurned(met, weightKg, plan.durationMin),
      source: 'coach',
      notes: plan.notes,
      exercises: all,
    });
  };

  const lockIn = () => {
    const all = [...completed, toStrength()];
    setCompleted(all);
    if (idx < total - 1) {
      const next = idx + 1;
      setIdx(next);
      setSets(initSets(plan.exercises[next]));
      setPhase('logging');
      setRest(restBetween);
    } else {
      finishWorkout(all);
      setActivePlan(null);
      setPhase('finished');
    }
  };

  const quit = () => {
    setActivePlan(null);
    router.back();
  };

  const allDone = sets.every((s) => s.done);

  if (phase === 'finished') {
    const totalSets = completed.reduce((n, e) => n + e.sets.length, 0);
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.doneIcon, { backgroundColor: theme.colors.brand }]}>
          <Ionicons name="checkmark" size={40} color={theme.colors.onBrand} />
        </View>
        <Text variant="title" style={{ marginTop: 20 }}>
          Workout complete!
        </Text>
        <Text color="textMuted" style={{ marginTop: 6 }}>
          {completed.length} exercises · {totalSets} sets logged
        </Text>
        <Button label="Done" onPress={() => router.replace('/(tabs)/workouts')} style={{ marginTop: 28, alignSelf: 'stretch' }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={quit} hitSlop={10}>
          <Ionicons name="close" size={26} color={theme.colors.text} />
        </Pressable>
        <Text variant="label" color="textMuted">
          Exercise {idx + 1} of {total}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {/* progress bar */}
      <View style={[styles.progress, { backgroundColor: theme.colors.cardMuted }]}>
        <View style={[styles.progressFill, { width: `${((idx + (phase === 'confirm' ? 1 : 0)) / total) * 100}%`, backgroundColor: theme.colors.brand }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text variant="title">{ex.name}</Text>
        <Text color="textMuted" style={{ marginTop: 4 }}>
          {ex.equipment ? `${ex.equipment} · ` : ''}Target {ex.sets} × {ex.reps}
          {ex.suggestedWeight ? ` @ ${ex.suggestedWeight}` : ''}
        </Text>

        {rest !== null && rest > 0 ? (
          <Card style={{ marginTop: 16, borderColor: theme.colors.brand, borderWidth: 1 }}>
            <View style={styles.row}>
              <Ionicons name="timer" size={22} color={theme.colors.brand} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="label">Rest</Text>
                <Text variant="caption" color="textMuted">
                  Next set in {rest}s
                </Text>
              </View>
              <Text variant="title" color="brand">
                {rest}
              </Text>
            </View>
            <View style={[styles.row, { marginTop: 12, gap: 10 }]}>
              <Button label="+15s" variant="secondary" size="sm" fullWidth={false} onPress={() => setRest((r) => (r ?? 0) + 15)} />
              <Button label="Skip rest" variant="ghost" size="sm" fullWidth={false} onPress={() => setRest(null)} />
            </View>
          </Card>
        ) : null}

        {phase === 'confirm' ? (
          <Card style={{ marginTop: 16 }}>
            <Text variant="label" style={{ marginBottom: 4 }}>
              Confirm your sets
            </Text>
            <Text variant="caption" color="textMuted" style={{ marginBottom: 12 }}>
              Fix anything before locking in this exercise.
            </Text>
            {sets.map((s, k) => (
              <SetEditor key={k} index={k} row={s} unit={unitLabel(units)} onChange={(patch) => updateSet(k, patch)} showDone={false} />
            ))}
          </Card>
        ) : (
          <Card style={{ marginTop: 16 }}>
            <Text variant="label" style={{ marginBottom: 12 }}>
              Log your sets
            </Text>
            {sets.map((s, k) => (
              <SetEditor key={k} index={k} row={s} unit={unitLabel(units)} onChange={(patch) => updateSet(k, patch)} onDone={() => markDone(k)} showDone />
            ))}
            <Pressable onPress={addSet} style={styles.addSet}>
              <Ionicons name="add-circle-outline" size={18} color={theme.colors.brand} />
              <Text style={{ color: theme.colors.brand, marginLeft: 6 }}>Add set</Text>
            </Pressable>
          </Card>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        {phase === 'confirm' ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button label="Back" variant="secondary" onPress={() => setPhase('logging')} />
            <View style={{ flex: 1 }}>
              <Button label={idx < total - 1 ? 'Lock in & next' : 'Finish workout'} icon="checkmark" onPress={lockIn} />
            </View>
          </View>
        ) : (
          <Button
            label={allDone ? 'Review & finish exercise' : 'Finish exercise'}
            icon="arrow-forward"
            onPress={() => setPhase('confirm')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function SetEditor({
  index,
  row,
  unit,
  onChange,
  onDone,
  showDone,
}: {
  index: number;
  row: SetRow;
  unit: string;
  onChange: (patch: Partial<SetRow>) => void;
  onDone?: () => void;
  showDone: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.setRow, { opacity: row.done && showDone ? 0.6 : 1 }]}>
      <Text variant="label" style={{ width: 48 }}>
        Set {index + 1}
      </Text>
      <View style={styles.setField}>
        <TextInput
          value={row.reps}
          onChangeText={(t) => onChange({ reps: t.replace(/[^0-9]/g, '') })}
          keyboardType="number-pad"
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
        />
        <Text variant="caption" color="textFaint" style={styles.unit}>
          reps
        </Text>
      </View>
      <View style={styles.setField}>
        <TextInput
          value={row.weight}
          onChangeText={(t) => onChange({ weight: t.replace(/[^0-9.]/g, '') })}
          keyboardType="decimal-pad"
          placeholder="—"
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
        />
        <Text variant="caption" color="textFaint" style={styles.unit}>
          {unit}
        </Text>
      </View>
      {showDone ? (
        <Pressable onPress={onDone} hitSlop={6} style={{ marginLeft: 4 }}>
          <Ionicons
            name={row.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={row.done ? theme.colors.brand : theme.colors.textFaint}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  progress: { height: 4, borderRadius: 999, marginHorizontal: 16 },
  progressFill: { height: 4, borderRadius: 999 },
  row: { flexDirection: 'row', alignItems: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  setField: { flex: 1, position: 'relative' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingRight: 40, height: 44, fontSize: 16 },
  unit: { position: 'absolute', right: 12, top: 14 },
  addSet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginTop: 4 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  doneIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
});
