import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, EmptyState, SectionHeader, Sparkline, Text } from '@/components';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import { relativeDay } from '@/utils/date';
import { goalLabel } from '@/utils/nutrition';
import { exerciseKey } from '@/utils/strength';
import { metricSeries, trainingImpactInsight } from '@/utils/trends';
import { displayToKg, kgToDisplay, unitLabel } from '@/utils/units';

export default function Progress() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, weightLogs, logWeight, exerciseHistory, updateProfile, bodyCompositionLogs, workouts } = useAppStore();
  const units = profile?.units ?? 'imperial';
  const u = unitLabel(units);

  const sorted = useMemo(
    () => [...weightLogs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    [weightLogs],
  );
  const start = sorted[0]?.weightKg;
  const current = sorted[sorted.length - 1]?.weightKg ?? profile?.weightKg;
  const target = profile?.targetWeightKg;
  const changeKg = start != null && current != null ? current - start : 0;

  const progressPct = useMemo(() => {
    if (target == null || start == null || current == null) return null;
    if (start === target) return 1;
    const p = (start - current) / (start - target); // works for both lose and gain
    return Math.max(0, Math.min(1, p));
  }, [target, start, current]);

  const topLifts = useMemo(
    () =>
      Object.values(exerciseHistory)
        .filter((r) => (r.bestWeightKg ?? 0) > 0)
        .sort((a, b) => (b.bestWeightKg ?? 0) - (a.bestWeightKg ?? 0))
        .slice(0, 6),
    [exerciseHistory],
  );

  const fatSeries = useMemo(() => metricSeries(bodyCompositionLogs, 'bodyFatPct'), [bodyCompositionLogs]);
  const leanSeries = useMemo(() => metricSeries(bodyCompositionLogs, 'leanMassKg'), [bodyCompositionLogs]);
  const bmiSeries = useMemo(() => metricSeries(bodyCompositionLogs, 'bmi'), [bodyCompositionLogs]);
  const impact = useMemo(
    () => trainingImpactInsight(bodyCompositionLogs, workouts, profile?.goal ?? 'maintain'),
    [bodyCompositionLogs, workouts, profile?.goal],
  );
  const comp = profile?.bodyComposition;
  const hasComposition = !!(fatSeries || leanSeries || bmiSeries || comp);

  const promptWeight = () => {
    const cur = current ?? profile?.weightKg ?? 0;
    Alert.prompt(
      'Log weight',
      `Enter your weight (${u})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (text?: string) => {
            const v = Number(text);
            if (v > 0) logWeight(displayToKg(v, units));
          },
        },
      ],
      'plain-text',
      String(kgToDisplay(cur, units)),
      'decimal-pad',
    );
  };

  const strengthGoal = profile?.strengthGoal;
  const goalBest = strengthGoal ? exerciseHistory[exerciseKey(strengthGoal.exercise)]?.bestWeightKg : undefined;
  const strengthPct =
    strengthGoal && goalBest != null && strengthGoal.targetKg > 0
      ? Math.max(0, Math.min(1, goalBest / strengthGoal.targetKg))
      : null;

  const setStrengthGoal = (exercise: string) => {
    Alert.prompt(
      'Strength goal',
      `Target weight for ${exercise} (${u})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set goal',
          onPress: (text?: string) => {
            const v = Number(text);
            if (v > 0) updateProfile({ strengthGoal: { exercise, targetKg: displayToKg(v, units) } });
          },
        },
      ],
      'plain-text',
      '',
      'decimal-pad',
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>
          Progress
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        {/* Weight progress */}
        <SectionHeader title="Weight" actionLabel="Log weight" onAction={promptWeight} />
        {sorted.length === 0 ? (
          <EmptyState icon="scale" title="No weight logged" message="Log your weight to track progress toward your goal." actionLabel="Log weight" onAction={promptWeight} />
        ) : (
          <Card>
            <View style={styles.rowBetween}>
              <View>
                <Text variant="display" color="brand">
                  {kgToDisplay(current ?? 0, units)}
                  <Text variant="subtitle" color="textMuted">
                    {' '}
                    {u}
                  </Text>
                </Text>
                <Text variant="caption" color="textMuted">
                  {target != null ? `Goal: ${kgToDisplay(target, units)} ${u} · ${goalLabel(profile?.goal ?? 'maintain')}` : 'No target set'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="subtitle" style={{ color: changeKg <= 0 ? theme.colors.success : theme.colors.warning }}>
                  {changeKg > 0 ? '+' : ''}
                  {kgToDisplay(changeKg, units)} {u}
                </Text>
                <Text variant="caption" color="textFaint">
                  since start
                </Text>
              </View>
            </View>

            {progressPct != null ? (
              <View style={{ marginTop: 16 }}>
                <View style={[styles.track, { backgroundColor: theme.colors.cardMuted }]}>
                  <View style={[styles.fill, { width: `${progressPct * 100}%`, backgroundColor: theme.colors.brand }]} />
                </View>
                <View style={styles.rowBetween}>
                  <Text variant="caption" color="textFaint">
                    {kgToDisplay(start ?? 0, units)} {u}
                  </Text>
                  <Text variant="caption" color="brand">
                    {Math.round(progressPct * 100)}%
                  </Text>
                  <Text variant="caption" color="textFaint">
                    {kgToDisplay(target ?? 0, units)} {u}
                  </Text>
                </View>
              </View>
            ) : null}

            {sorted.length >= 2 ? (
              <View style={{ marginTop: 16 }}>
                <Sparkline values={sorted.map((w) => w.weightKg)} />
                <View style={styles.rowBetween}>
                  <Text variant="caption" color="textFaint">
                    {relativeDay(sorted[0].loggedAt)}
                  </Text>
                  <Text variant="caption" color="textFaint">
                    {relativeDay(sorted[sorted.length - 1].loggedAt)}
                  </Text>
                </View>
              </View>
            ) : null}
          </Card>
        )}

        {/* Body composition (e.g. from a smart scale via Apple Health) */}
        {hasComposition ? (
          <>
            <SectionHeader title="Body composition" />
            <Card>
              <View style={styles.compRow}>
                <MetricTile
                  label="Body fat"
                  value={fatSeries ? `${fatSeries.latest}%` : comp?.bodyFatPct != null ? `${comp.bodyFatPct}%` : '—'}
                  delta={fatSeries && fatSeries.points.length >= 2 ? `${signed(fatSeries.delta)}%` : undefined}
                  deltaColor={fatSeries ? goodBad(-fatSeries.delta, theme) : undefined}
                />
                <MetricTile
                  label="Lean mass"
                  value={
                    leanSeries
                      ? `${kgToDisplay(leanSeries.latest, units)}`
                      : comp?.leanMassKg != null
                        ? `${kgToDisplay(comp.leanMassKg, units)}`
                        : '—'
                  }
                  unit={leanSeries || comp?.leanMassKg != null ? u : undefined}
                  delta={
                    leanSeries && leanSeries.points.length >= 2
                      ? `${signed(kgToDisplay(leanSeries.delta, units))} ${u}`
                      : undefined
                  }
                  deltaColor={leanSeries ? goodBad(leanSeries.delta, theme) : undefined}
                />
                <MetricTile
                  label="BMI"
                  value={bmiSeries ? `${bmiSeries.latest}` : comp?.bmi != null ? `${comp.bmi}` : '—'}
                  delta={bmiSeries && bmiSeries.points.length >= 2 ? signed(bmiSeries.delta) : undefined}
                  deltaColor={theme.colors.textMuted}
                />
              </View>

              {fatSeries && fatSeries.points.length >= 2 ? (
                <MiniTrend label="Body fat %" values={fatSeries.points.map((p) => p.value)} />
              ) : null}
              {leanSeries && leanSeries.points.length >= 2 ? (
                <MiniTrend label={`Lean mass (${u})`} values={leanSeries.points.map((p) => kgToDisplay(p.value, units))} />
              ) : null}

              {comp?.updatedAt ? (
                <Text variant="caption" color="textFaint" style={{ marginTop: 12 }}>
                  From Apple Health · updated {relativeDay(comp.updatedAt)}
                </Text>
              ) : null}
            </Card>

            {impact ? (
              <Card style={{ marginTop: 8 }}>
                <View style={styles.rowBetween}>
                  <Text variant="label">Training impact</Text>
                  <Ionicons
                    name={impact.positive === true ? 'trending-up' : impact.positive === false ? 'trending-down' : 'analytics'}
                    size={18}
                    color={
                      impact.positive === true
                        ? theme.colors.success
                        : impact.positive === false
                          ? theme.colors.warning
                          : theme.colors.textMuted
                    }
                  />
                </View>
                <Text color="textMuted" style={{ marginTop: 8, lineHeight: 20 }}>
                  {impact.text}
                </Text>
              </Card>
            ) : bodyCompositionLogs.length < 2 ? (
              <Text color="textFaint" variant="caption" style={{ marginTop: 8 }}>
                Import from Apple Health regularly (Profile → Apple Health) to unlock trend analysis of how your training is
                moving these numbers.
              </Text>
            ) : null}
          </>
        ) : null}

        {/* Strength progress */}
        <SectionHeader title="Strength" />
        <Card>
          {strengthGoal ? (
            <>
              <View style={styles.rowBetween}>
                <Text variant="label">{strengthGoal.exercise}</Text>
                <Text variant="caption" color="textMuted">
                  {goalBest != null ? kgToDisplay(goalBest, units) : 0} / {kgToDisplay(strengthGoal.targetKg, units)} {u}
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: theme.colors.cardMuted, marginTop: 10 }]}>
                <View style={[styles.fill, { width: `${(strengthPct ?? 0) * 100}%`, backgroundColor: theme.colors.protein }]} />
              </View>
              <Pressable onPress={() => setStrengthGoal(strengthGoal.exercise)} style={{ marginTop: 10 }}>
                <Text variant="caption" style={{ color: theme.colors.brand }}>
                  Edit target
                </Text>
              </Pressable>
            </>
          ) : (
            <Text color="textMuted">Set a strength goal to track progress toward a target lift.</Text>
          )}
        </Card>

        {topLifts.length === 0 ? (
          <Text color="textFaint" variant="caption" style={{ marginTop: 12 }}>
            Complete a workout with weights to see your top lifts here.
          </Text>
        ) : (
          <>
            <Text variant="label" color="textMuted" style={{ marginTop: 16, marginBottom: 10 }}>
              Top lifts {strengthGoal ? '' : '· tap to set as goal'}
            </Text>
            {topLifts.map((r) => (
              <Card key={r.name} style={{ marginBottom: 8 }} onPress={() => setStrengthGoal(r.name)}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text variant="label">{r.name}</Text>
                    <Text variant="caption" color="textMuted">
                      {r.sessions} session{r.sessions === 1 ? '' : 's'} · last {kgToDisplay(r.lastWeightKg ?? 0, units)} {u}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="subtitle" color="brand">
                      {kgToDisplay(r.bestWeightKg ?? 0, units)} {u}
                    </Text>
                    <Text variant="caption" color="textFaint">
                      best
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;

function goodBad(v: number, theme: ReturnType<typeof useTheme>): string {
  if (v > 0.0001) return theme.colors.success;
  if (v < -0.0001) return theme.colors.warning;
  return theme.colors.textMuted;
}

function MetricTile({
  label,
  value,
  unit,
  delta,
  deltaColor,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaColor?: string;
}) {
  return (
    <View style={styles.compItem}>
      <Text variant="subtitle" color="brand">
        {value}
        {unit ? (
          <Text variant="caption" color="textMuted">
            {' '}
            {unit}
          </Text>
        ) : null}
      </Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      {delta ? (
        <Text variant="caption" style={{ color: deltaColor, marginTop: 2 }}>
          {delta}
        </Text>
      ) : null}
    </View>
  );
}

function MiniTrend({ label, values }: { label: string; values: number[] }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text variant="caption" color="textFaint" style={{ marginBottom: 4 }}>
        {label}
      </Text>
      <Sparkline values={values} height={48} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { height: 10, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 999 },
  compRow: { flexDirection: 'row', justifyContent: 'space-between' },
  compItem: { flex: 1, alignItems: 'center' },
});
