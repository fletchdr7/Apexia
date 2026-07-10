import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Text } from '@/components';
import { ACTIVITIES } from '@/constants/activities';
import { EQUIPMENT_CATALOG } from '@/constants/equipment';
import { generateWorkoutPlan } from '@/lib/api';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { ExperienceLevel, WorkoutLocation, WorkoutPlan } from '@/types';
import { estimateCaloriesBurned } from '@/utils/nutrition';
import { experienceLabel } from '@/utils/strength';

const DURATIONS = [20, 30, 45, 60, 75];

function parseReps(reps: string): number {
  const m = reps.match(/\d+/);
  return m ? Number(m[0]) : 10;
}
function parseWeight(s?: string): number | undefined {
  if (!s) return undefined;
  const m = s.match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : undefined;
}

export default function BuildWorkout() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, updateProfile, gymEquipmentIds, homeEquipmentIds, customEquipment, addWorkout } = useAppStore();

  const [location, setLocation] = useState<WorkoutLocation>('gym');
  const [duration, setDuration] = useState(45);
  const [experience, setExperience] = useState<ExperienceLevel>(profile?.experience ?? 'intermediate');
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const allEquip = useMemo(() => [...EQUIPMENT_CATALOG, ...customEquipment], [customEquipment]);
  const ids = location === 'gym' ? gymEquipmentIds : homeEquipmentIds;
  const equipForLocation = useMemo(() => allEquip.filter((e) => ids.includes(e.id)), [allEquip, ids]);

  const generate = async () => {
    if (profile && experience !== profile.experience) updateProfile({ experience });
    setLoading(true);
    setPlan(null);
    try {
      const result = await generateWorkoutPlan({
        profile: profile ? { ...profile, experience } : null,
        location,
        durationMin: duration,
        equipment: equipForLocation.map((e) => ({
          name: e.name,
          exampleExercises: e.exampleExercises,
          primaryMuscles: e.primaryMuscles,
        })),
      });
      setPlan(result);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const saveWorkout = () => {
    if (!plan) return;
    const weightKg = profile?.weightKg ?? 75;
    addWorkout({
      type: location,
      title: plan.title,
      performedAt: new Date().toISOString(),
      durationMin: plan.durationMin,
      intensity: 'moderate',
      caloriesBurned: estimateCaloriesBurned(ACTIVITIES[location].met, weightKg, plan.durationMin),
      source: 'coach',
      notes: plan.notes,
      exercises: plan.exercises.map((pe) => ({
        name: pe.name,
        sets: Array.from({ length: pe.sets }, () => ({
          reps: parseReps(pe.reps),
          weightKg: parseWeight(pe.suggestedWeight),
        })),
      })),
    });
    router.replace('/(tabs)/workouts');
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

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text variant="label" color="textMuted" style={styles.lbl}>
          Where are you training?
        </Text>
        <View style={styles.rowWrap}>
          <Chip label="Gym" icon="business" selected={location === 'gym'} onPress={() => setLocation('gym')} />
          <Chip label="Home" icon="home" selected={location === 'home'} onPress={() => setLocation('home')} />
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
          {equipForLocation.length === 0 ? (
            <Text variant="caption" color="textMuted" style={{ marginTop: 6 }}>
              No {location} equipment selected — we&apos;ll build a bodyweight session. Add equipment for more variety.
            </Text>
          ) : (
            <Text variant="caption" color="textMuted" style={{ marginTop: 6 }} numberOfLines={2}>
              {equipForLocation.map((e) => e.name).join(', ')}
            </Text>
          )}
        </Card>

        <Button
          label={plan ? 'Regenerate' : 'Build my workout'}
          icon="sparkles"
          onPress={generate}
          loading={loading}
          style={{ marginTop: 16 }}
        />

        {plan ? (
          <View style={{ marginTop: 20 }}>
            <Text variant="title">{plan.title}</Text>
            <Text color="textMuted" style={{ marginTop: 4 }}>
              {plan.focus} · {plan.durationMin} min
            </Text>

            {plan.warmup.length ? (
              <Card style={{ marginTop: 12 }}>
                <Text variant="label" style={{ marginBottom: 8 }}>
                  Warm-up
                </Text>
                {plan.warmup.map((w, i) => (
                  <Text key={i} color="textMuted" style={{ marginTop: 4 }}>
                    • {w}
                  </Text>
                ))}
              </Card>
            ) : null}

            {plan.exercises.map((ex, i) => (
              <Card key={i} style={{ marginTop: 12 }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text variant="label">{ex.name}</Text>
                    {ex.equipment ? (
                      <Text variant="caption" color="textFaint">
                        {ex.equipment}
                        {ex.muscles && ex.muscles.length ? ` · ${ex.muscles.join(', ')}` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.setsBadge, { backgroundColor: theme.colors.brandSoft }]}>
                    <Text variant="label" style={{ color: theme.colors.brand }}>
                      {ex.sets} × {ex.reps}
                    </Text>
                  </View>
                </View>
                <View style={[styles.metaRow, { borderTopColor: theme.colors.border }]}>
                  <Meta icon="barbell" label={ex.suggestedWeight ?? '—'} />
                  {ex.restSec ? <Meta icon="timer" label={`${ex.restSec}s rest`} /> : null}
                </View>
                {ex.notes ? (
                  <Text variant="caption" color="textMuted" style={{ marginTop: 8 }}>
                    {ex.notes}
                  </Text>
                ) : null}
              </Card>
            ))}

            {plan.cooldown.length ? (
              <Card style={{ marginTop: 12 }}>
                <Text variant="label" style={{ marginBottom: 8 }}>
                  Cool-down
                </Text>
                {plan.cooldown.map((c, i) => (
                  <Text key={i} color="textMuted" style={{ marginTop: 4 }}>
                    • {c}
                  </Text>
                ))}
              </Card>
            ) : null}

            {plan.notes ? (
              <Text variant="caption" color="textFaint" style={{ marginTop: 12 }}>
                {plan.notes}
              </Text>
            ) : null}

            <Button label="Save to my workouts" icon="checkmark" onPress={saveWorkout} style={{ marginTop: 16 }} />
          </View>
        ) : null}

        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <ActivityIndicator color={theme.colors.brand} />
            <Text color="textMuted" style={{ marginTop: 8 }}>
              Building your {location} session…
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Meta({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={theme.colors.textMuted} style={{ marginRight: 5 }} />
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  lbl: { marginTop: 20, marginBottom: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  setsBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  meta: { flexDirection: 'row', alignItems: 'center' },
});
