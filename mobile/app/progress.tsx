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
import { displayToKg, formatWeight, kgToDisplay, unitLabel } from '@/utils/units';

export default function Progress() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, weightLogs, logWeight, exerciseHistory, updateProfile } = useAppStore();
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
        {profile?.bodyComposition &&
        (profile.bodyComposition.bodyFatPct != null ||
          profile.bodyComposition.leanMassKg != null ||
          profile.bodyComposition.bmi != null) ? (
          <>
            <SectionHeader title="Body composition" />
            <Card>
              <View style={styles.compRow}>
                {profile.bodyComposition.bodyFatPct != null ? (
                  <View style={styles.compItem}>
                    <Text variant="subtitle" color="brand">
                      {profile.bodyComposition.bodyFatPct}%
                    </Text>
                    <Text variant="caption" color="textMuted">
                      Body fat
                    </Text>
                  </View>
                ) : null}
                {profile.bodyComposition.leanMassKg != null ? (
                  <View style={styles.compItem}>
                    <Text variant="subtitle" color="brand">
                      {formatWeight(profile.bodyComposition.leanMassKg, units)}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      Lean mass
                    </Text>
                  </View>
                ) : null}
                {profile.bodyComposition.bmi != null ? (
                  <View style={styles.compItem}>
                    <Text variant="subtitle" color="brand">
                      {profile.bodyComposition.bmi}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      BMI
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="caption" color="textFaint" style={{ marginTop: 12 }}>
                From Apple Health
                {profile.bodyComposition.updatedAt ? ` · updated ${relativeDay(profile.bodyComposition.updatedAt)}` : ''}
              </Text>
            </Card>
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { height: 10, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 999 },
  compRow: { flexDirection: 'row', justifyContent: 'space-between' },
  compItem: { flex: 1, alignItems: 'center' },
});
