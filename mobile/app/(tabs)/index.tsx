import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, MacroBar, ProgressRing, Screen, SectionHeader, StatTile, Text } from '@/components';
import { ACTIVITIES } from '@/constants/activities';
import { generateDailyPlan } from '@/lib/api';
import { getTodayHealth, type HealthSnapshot } from '@/lib/health';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { CoachPlan, DailyPlanItem } from '@/types';
import { greeting, relativeDay, timeLabel } from '@/utils/date';
import { clampPct } from '@/utils/nutrition';
import { kgToDisplay, unitLabel } from '@/utils/units';

export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, todaysNutrition, todaysWorkouts, workouts, healthEnabled, weightLogs } = useAppStore();
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [doneItems, setDoneItems] = useState<Record<string, boolean>>({});
  const [health, setHealth] = useState<HealthSnapshot | null>(null);

  useEffect(() => {
    generateDailyPlan(profile).then(setPlan).catch(() => undefined);
  }, [profile]);

  useEffect(() => {
    if (healthEnabled) getTodayHealth().then(setHealth).catch(() => undefined);
  }, [healthEnabled]);

  const nutrition = todaysNutrition();
  const targets = profile?.targets;
  const calPct = targets ? clampPct(nutrition.calories / targets.calories) : 0;
  const remaining = targets ? Math.max(0, Math.round(targets.calories - nutrition.calories)) : 0;
  const workoutsToday = todaysWorkouts();

  const units = profile?.units ?? 'imperial';
  const wSorted = [...weightLogs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const wStart = wSorted[0]?.weightKg;
  const wCurrent = wSorted[wSorted.length - 1]?.weightKg ?? profile?.weightKg;
  const wTarget = profile?.targetWeightKg;
  const wChange = wStart != null && wCurrent != null ? wCurrent - wStart : 0;
  const wPct =
    wTarget != null && wStart != null && wCurrent != null && wStart !== wTarget
      ? Math.max(0, Math.min(1, (wStart - wCurrent) / (wStart - wTarget)))
      : null;
  const showProgress = wTarget != null && wSorted.length > 0;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text color="textMuted">{greeting()},</Text>
          <Text variant="title">{profile?.displayName ?? 'Athlete'}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          style={[styles.avatar, { backgroundColor: theme.colors.brand }]}
        >
          <Text style={{ color: theme.colors.onBrand, fontWeight: '700' }}>
            {(profile?.displayName ?? 'A').slice(0, 1).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      {/* Calories + macros */}
      <Card style={{ marginTop: 16 }}>
        <View style={styles.calRow}>
          <ProgressRing
            progress={calPct}
            centerLabel={`${remaining}`}
            centerSub="kcal left"
            color={theme.colors.calories}
          />
          <View style={{ flex: 1, marginLeft: 20 }}>
            <Text variant="caption" color="textMuted">
              Eaten {Math.round(nutrition.calories)} · Target {targets?.calories ?? '—'}
            </Text>
            <View style={{ marginTop: 12 }}>
              <MacroBar label="Protein" value={nutrition.proteinG} target={targets?.proteinG ?? 0} color={theme.colors.protein} />
              <MacroBar label="Carbs" value={nutrition.carbsG} target={targets?.carbsG ?? 0} color={theme.colors.carbs} />
              <MacroBar label="Fat" value={nutrition.fatG} target={targets?.fatG ?? 0} color={theme.colors.fat} />
            </View>
          </View>
        </View>
      </Card>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <QuickAction icon="camera" label="Scan food" tint={theme.colors.calories} onPress={() => router.push('/nutrition/scan')} />
        <QuickAction icon="add-circle" label="Log workout" tint={theme.colors.protein} onPress={() => router.push('/workout/log')} />
        <QuickAction icon="flask" label="Supplement" tint={theme.colors.fat} onPress={() => router.push('/supplements')} />
        <QuickAction icon="sparkles" label="Ask coach" tint={theme.colors.warning} onPress={() => router.push('/(tabs)/coach')} />
      </View>

      {/* Weight progress */}
      {showProgress ? (
        <>
          <SectionHeader title="Progress" actionLabel="Details" onAction={() => router.push('/progress')} />
          <Card onPress={() => router.push('/progress')}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="title">
                  {kgToDisplay(wCurrent ?? 0, units)} <Text variant="caption" color="textMuted">{unitLabel(units)}</Text>
                </Text>
                <Text variant="caption" color="textMuted">
                  {wChange > 0 ? '+' : ''}
                  {kgToDisplay(wChange, units)} {unitLabel(units)} since start · goal {kgToDisplay(wTarget ?? 0, units)}{' '}
                  {unitLabel(units)}
                </Text>
              </View>
              {wPct != null ? (
                <Text variant="subtitle" color="brand">
                  {Math.round(wPct * 100)}%
                </Text>
              ) : null}
            </View>
            {wPct != null ? (
              <View style={[styles.progressTrack, { backgroundColor: theme.colors.cardMuted }]}>
                <View style={[styles.progressFill, { width: `${wPct * 100}%`, backgroundColor: theme.colors.brand }]} />
              </View>
            ) : null}
          </Card>
        </>
      ) : null}

      {/* Apple Health */}
      {healthEnabled && health && (health.steps != null || health.activeEnergyKcal != null) ? (
        <>
          <SectionHeader title="Apple Health" />
          <View style={{ flexDirection: 'row' }}>
            <StatTile
              icon="footsteps"
              label="Steps"
              value={health.steps != null ? health.steps.toLocaleString() : '—'}
              tint={theme.colors.info}
            />
            <View style={{ width: 12 }} />
            <StatTile
              icon="flame"
              label="Active kcal"
              value={health.activeEnergyKcal != null ? String(health.activeEnergyKcal) : '—'}
              tint={theme.colors.fat}
            />
          </View>
        </>
      ) : null}

      {/* Today's plan */}
      <SectionHeader title="Today's plan" actionLabel="Refresh" onAction={() => generateDailyPlan(profile).then(setPlan)} />
      {plan ? (
        <Card padded={false}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <View style={styles.planHead}>
              <Ionicons name="sparkles" size={16} color={theme.colors.brand} />
              <Text variant="label" style={{ color: theme.colors.brand, marginLeft: 6 }}>
                Focus: {plan.focus}
              </Text>
            </View>
            <Text color="textMuted" style={{ marginTop: 6, lineHeight: 20 }}>
              {plan.summary}
            </Text>
          </View>
          {plan.items.map((item, i) => (
            <PlanRow
              key={item.id}
              item={item}
              last={i === plan.items.length - 1}
              done={!!doneItems[item.id]}
              onToggle={() => setDoneItems((d) => ({ ...d, [item.id]: !d[item.id] }))}
            />
          ))}
        </Card>
      ) : (
        <Card>
          <Text color="textMuted">Building your plan…</Text>
        </Card>
      )}

      {/* Activity today */}
      <SectionHeader title="Movement" actionLabel="All workouts" onAction={() => router.push('/(tabs)/workouts')} />
      {workoutsToday.length === 0 ? (
        <Card onPress={() => router.push('/workout/log')}>
          <View style={styles.row}>
            <View style={[styles.miniIcon, { backgroundColor: theme.colors.brandSoft }]}>
              <Ionicons name="fitness" size={20} color={theme.colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label">No workout logged yet today</Text>
              <Text variant="caption" color="textMuted">
                Even 15 minutes counts. Tap to log one.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textFaint} />
          </View>
        </Card>
      ) : (
        workoutsToday.map((w) => {
          const meta = ACTIVITIES[w.type];
          return (
            <Card key={w.id} style={{ marginBottom: 10 }}>
              <View style={styles.row}>
                <View style={[styles.miniIcon, { backgroundColor: theme.colors.brandSoft }]}>
                  <Ionicons name={meta.icon} size={20} color={theme.colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label">{w.title}</Text>
                  <Text variant="caption" color="textMuted">
                    {w.durationMin} min · {w.caloriesBurned ?? 0} kcal · {timeLabel(w.performedAt)}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })
      )}

      {workouts.length > 0 && (
        <>
          <SectionHeader title="Recent" />
          {workouts.slice(0, 3).map((w) => {
            const meta = ACTIVITIES[w.type];
            return (
              <View key={w.id} style={styles.recentRow}>
                <Ionicons name={meta.icon} size={18} color={theme.colors.textMuted} style={{ marginRight: 10 }} />
                <Text style={{ flex: 1 }}>{w.title}</Text>
                <Text variant="caption" color="textFaint">
                  {relativeDay(w.performedAt)}
                </Text>
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickItem, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.quickIcon, { backgroundColor: tint + '22' }]}>
        <Ionicons name={icon} size={24} color={tint} />
      </View>
      <Text variant="caption" color="textMuted" center>
        {label}
      </Text>
    </Pressable>
  );
}

function PlanRow({
  item,
  last,
  done,
  onToggle,
}: {
  item: DailyPlanItem;
  last: boolean;
  done: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const kindIcon: Record<DailyPlanItem['kind'], keyof typeof Ionicons.glyphMap> = {
    meal: 'restaurant',
    workout: 'barbell',
    supplement: 'flask',
    habit: 'leaf',
  };
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.planRow, { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth }, last && { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }]}
    >
      <View style={[styles.miniIcon, { backgroundColor: theme.colors.cardMuted }]}>
        <Ionicons name={kindIcon[item.kind]} size={18} color={theme.colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="label" style={done ? { textDecorationLine: 'line-through', color: theme.colors.textFaint } : undefined}>
          {item.title}
        </Text>
        <Text variant="caption" color="textMuted">
          {item.time ? `${item.time} · ` : ''}
          {item.detail}
        </Text>
      </View>
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={done ? theme.colors.brand : theme.colors.textFaint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  calRow: { flexDirection: 'row', alignItems: 'center' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  quickItem: { alignItems: 'center', flex: 1 },
  quickIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  planHead: { flexDirection: 'row', alignItems: 'center' },
  planRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  miniIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  progressTrack: { height: 8, borderRadius: 999, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 999 },
});
