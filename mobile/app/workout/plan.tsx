import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, ExerciseDemo, Text } from '@/components';
import { EQUIPMENT_CATALOG, LIBRARY_EQUIPMENT_BY_CATEGORY, LIBRARY_EQUIPMENT_BY_ID } from '@/constants/equipment';
import { MUSCLE_GROUPS } from '@/constants/muscles';
import { generateWorkoutPlan, swapExercise } from '@/lib/api';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { ExperienceLevel, PlannedExercise, WorkoutLocation, WorkoutPlan } from '@/types';
import { exerciseKey, experienceLabel, progressionFor } from '@/utils/strength';
import { formatPlannedWeight } from '@/utils/units';

const DURATIONS = [20, 30, 45, 60, 75];

export default function BuildWorkout() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, updateProfile, gymEquipmentIds, homeEquipmentIds, customEquipment, exerciseHistory, setActivePlan } =
    useAppStore();
  const units = profile?.units ?? 'imperial';

  const [location, setLocation] = useState<WorkoutLocation>('gym');
  const [duration, setDuration] = useState(45);
  const [experience, setExperience] = useState<ExperienceLevel>(profile?.experience ?? 'intermediate');
  const [muscles, setMuscles] = useState<string[]>(['full_body']);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<PlannedExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [swapFor, setSwapFor] = useState<number | null>(null);
  const [swapOptions, setSwapOptions] = useState<PlannedExercise[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);

  const allEquip = useMemo(() => [...EQUIPMENT_CATALOG, ...customEquipment], [customEquipment]);
  const ids = location === 'gym' ? gymEquipmentIds : homeEquipmentIds;
  const equipForLocation = useMemo(() => allEquip.filter((e) => ids.includes(e.id)), [allEquip, ids]);
  const availableEquipment = useMemo(() => {
    const set = new Set<string>(['body only']);
    for (const e of equipForLocation) {
      const tags = e.source === 'catalog' ? LIBRARY_EQUIPMENT_BY_ID[e.id] : LIBRARY_EQUIPMENT_BY_CATEGORY[e.category];
      (tags ?? []).forEach((t) => set.add(t));
    }
    return [...set];
  }, [equipForLocation]);

  // Preload remembered weights and apply progressive overload to any exercise
  // the user has performed before.
  const applyHistory = (list: PlannedExercise[]): PlannedExercise[] =>
    list.map((ex) => {
      const rec = exerciseHistory[exerciseKey(ex.name)];
      if (!rec) return ex;
      const p = progressionFor(rec, ex.reps, units);
      return {
        ...ex,
        suggestedWeight: p.suggestedWeight ?? ex.suggestedWeight,
        notes: ex.notes ? `${ex.notes} · ${p.note}` : p.note,
      };
    });

  const toggleMuscle = (id: string) => {
    setMuscles((prev) => {
      if (id === 'full_body') return ['full_body'];
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev.filter((m) => m !== 'full_body'), id];
      return next.length ? next : ['full_body'];
    });
  };

  const generate = async () => {
    if (profile && experience !== profile.experience) updateProfile({ experience });
    setLoading(true);
    setPlan(null);
    setSwapFor(null);
    try {
      const result = await generateWorkoutPlan({
        profile: profile ? { ...profile, experience } : null,
        location,
        durationMin: duration,
        muscleGroups: muscles,
        availableEquipment,
      });
      setPlan(result);
      const displayed = result.exercises.map((ex) => ({
        ...ex,
        suggestedWeight: formatPlannedWeight(ex.suggestedWeight, units),
      }));
      setExercises(applyHistory(displayed));
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const updateExercise = (i: number, patch: Partial<PlannedExercise>) => {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)));
  };
  const move = (i: number, dir: -1 | 1) => {
    setExercises((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const remove = (i: number) => setExercises((prev) => prev.filter((_, idx) => idx !== i));

  const openSwap = async (i: number) => {
    if (swapFor === i) {
      setSwapFor(null);
      return;
    }
    setSwapFor(i);
    setSwapOptions([]);
    setSwapLoading(true);
    try {
      const opts = await swapExercise({
        profile,
        exercise: exercises[i].name,
        muscles: exercises[i].muscles ?? muscles,
        availableEquipment,
      });
      setSwapOptions(opts);
    } catch {
      setSwapOptions([]);
    } finally {
      setSwapLoading(false);
    }
  };
  const applySwap = (i: number, alt: PlannedExercise) => {
    setExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== i) return ex;
        const displayWeight = alt.suggestedWeight ? formatPlannedWeight(alt.suggestedWeight, units) : ex.suggestedWeight;
        const merged = { ...alt, sets: ex.sets, reps: ex.reps, suggestedWeight: displayWeight };
        return applyHistory([merged])[0];
      }),
    );
    setSwapFor(null);
  };

  const start = () => {
    if (!plan) return;
    setActivePlan({ ...plan, exercises });
    router.push('/workout/session');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>
          Build a workout
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Text variant="label" color="textMuted" style={styles.lbl}>
          Where are you training?
        </Text>
        <View style={styles.rowWrap}>
          <Chip label="Gym" icon="business" selected={location === 'gym'} onPress={() => setLocation('gym')} />
          <Chip label="Home" icon="home" selected={location === 'home'} onPress={() => setLocation('home')} />
        </View>

        <Text variant="label" color="textMuted" style={styles.lbl}>
          Muscle groups
        </Text>
        <View style={styles.rowWrap}>
          {MUSCLE_GROUPS.map((m) => (
            <Chip key={m.id} label={m.label} selected={muscles.includes(m.id)} onPress={() => toggleMuscle(m.id)} />
          ))}
        </View>

        <Text variant="label" color="textMuted" style={styles.lbl}>
          How much time? ({duration} min)
        </Text>
        <View style={styles.rowWrap}>
          {DURATIONS.map((d) => (
            <Chip key={d} label={`${d} min`} selected={duration === d} onPress={() => setDuration(d)} />
          ))}
        </View>

        <Text variant="label" color="textMuted" style={styles.lbl}>
          Experience (sets your weights)
        </Text>
        <View style={styles.rowWrap}>
          {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((e) => (
            <Chip key={e} label={experienceLabel(e)} selected={experience === e} onPress={() => setExperience(e)} />
          ))}
        </View>

        <Card muted style={{ marginTop: 16 }}>
          <View style={styles.row}>
            <Ionicons name="barbell" size={18} color={theme.colors.brand} />
            <Text variant="label" style={{ marginLeft: 8, flex: 1 }}>
              {equipForLocation.length} {location} items available
            </Text>
            <Pressable onPress={() => router.push('/equipment')} hitSlop={8}>
              <Text variant="label" style={{ color: theme.colors.brand }}>
                Manage
              </Text>
            </Pressable>
          </View>
        </Card>

        <Button
          label={plan ? 'Regenerate' : 'Build my workout'}
          icon="sparkles"
          onPress={generate}
          loading={loading}
          style={{ marginTop: 16 }}
        />

        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <ActivityIndicator color={theme.colors.brand} />
            <Text color="textMuted" style={{ marginTop: 8 }}>
              Building your {location} session…
            </Text>
          </View>
        ) : null}

        {plan ? (
          <View style={{ marginTop: 20 }}>
            <Text variant="title">{plan.title}</Text>
            <Text color="textMuted" style={{ marginTop: 4 }}>
              {plan.focus} · {plan.durationMin} min · tap values to edit
            </Text>

            {exercises.map((ex, i) => (
              <Card key={`${ex.name}-${i}`} style={{ marginTop: 12 }}>
                <View style={styles.row}>
                  <ExerciseDemo name={ex.name} muscles={ex.muscles} size={44} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="label">{ex.name}</Text>
                    {ex.equipment ? (
                      <Text variant="caption" color="textFaint">
                        {ex.equipment}
                        {ex.muscles && ex.muscles.length ? ` · ${ex.muscles.join(', ')}` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.iconRow}>
                    <IconBtn icon="arrow-up" onPress={() => move(i, -1)} disabled={i === 0} />
                    <IconBtn icon="arrow-down" onPress={() => move(i, 1)} disabled={i === exercises.length - 1} />
                    <IconBtn icon="swap-horizontal" onPress={() => openSwap(i)} active={swapFor === i} />
                    <IconBtn icon="trash-outline" onPress={() => remove(i)} />
                  </View>
                </View>

                <View style={styles.editRow}>
                  <Stepper label="Sets" value={ex.sets} onChange={(v) => updateExercise(i, { sets: v })} />
                  <FieldInput label="Reps" value={ex.reps} onChangeText={(t) => updateExercise(i, { reps: t })} width={70} />
                  <FieldInput
                    label="Weight"
                    value={ex.suggestedWeight ?? ''}
                    onChangeText={(t) => updateExercise(i, { suggestedWeight: t })}
                    width={110}
                  />
                </View>

                {swapFor === i ? (
                  <View style={[styles.swapBox, { borderTopColor: theme.colors.border }]}>
                    <Text variant="caption" color="textMuted" style={{ marginBottom: 8 }}>
                      Swap for another {(ex.muscles && ex.muscles[0]) || 'similar'} exercise:
                    </Text>
                    {swapLoading ? (
                      <ActivityIndicator color={theme.colors.brand} />
                    ) : swapOptions.length ? (
                      swapOptions.map((alt, k) => (
                        <Pressable key={k} onPress={() => applySwap(i, alt)} style={styles.swapOption}>
                          <Ionicons name="repeat" size={16} color={theme.colors.brand} style={{ marginRight: 8 }} />
                          <View style={{ flex: 1 }}>
                            <Text>{alt.name}</Text>
                            {alt.equipment ? (
                              <Text variant="caption" color="textFaint">
                                {alt.equipment}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      ))
                    ) : (
                      <Text variant="caption" color="textFaint">
                        No alternatives found for your equipment.
                      </Text>
                    )}
                  </View>
                ) : null}
              </Card>
            ))}

            <Button label="Start workout" icon="play" onPress={start} style={{ marginTop: 20 }} disabled={exercises.length === 0} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function IconBtn({
  icon,
  onPress,
  disabled,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={{ padding: 6, opacity: disabled ? 0.3 : 1 }}>
      <Ionicons name={icon} size={18} color={active ? theme.colors.brand : theme.colors.textMuted} />
    </Pressable>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const theme = useTheme();
  return (
    <View>
      <Text variant="caption" color="textMuted" style={{ marginBottom: 4 }}>
        {label}
      </Text>
      <View style={[styles.stepper, { borderColor: theme.colors.border }]}>
        <Pressable onPress={() => onChange(Math.max(1, value - 1))} hitSlop={6} style={styles.stepBtn}>
          <Ionicons name="remove" size={16} color={theme.colors.text} />
        </Pressable>
        <Text variant="label" style={{ minWidth: 20, textAlign: 'center' }}>
          {value}
        </Text>
        <Pressable onPress={() => onChange(Math.min(10, value + 1))} hitSlop={6} style={styles.stepBtn}>
          <Ionicons name="add" size={16} color={theme.colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function FieldInput({
  label,
  value,
  onChangeText,
  width,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  width: number;
}) {
  const theme = useTheme();
  return (
    <View>
      <Text variant="caption" color="textMuted" style={{ marginBottom: 4 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.field, { width, color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
        placeholderTextColor={theme.colors.textFaint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  lbl: { marginTop: 20, marginBottom: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  editRow: { flexDirection: 'row', gap: 14, marginTop: 12, alignItems: 'flex-end' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 4, height: 40 },
  stepBtn: { padding: 8 },
  field: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 40 },
  swapBox: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  swapOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});
