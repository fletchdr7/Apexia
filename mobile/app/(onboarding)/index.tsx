import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Input, MacroBar, Text } from '@/components';
import { ACTIVITY_LIST } from '@/constants/activities';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type {
  ActivityLevel,
  GoalType,
  LifestyleTag,
  Sex,
  UnitSystem,
  UserProfile,
  WorkoutType,
} from '@/types';
import { computeTargets, goalLabel } from '@/utils/nutrition';
import { ftInToCm, lbToKg } from '@/utils/units';

interface Draft {
  displayName: string;
  sex: Sex;
  units: UnitSystem;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  age: number;
  activityLevel: ActivityLevel;
  preferredActivities: WorkoutType[];
  weeklyWorkoutTarget: number;
  goal: GoalType;
  lifestyle: LifestyleTag[];
  dietaryPreferences: string[];
}

const GOALS: Array<{ value: GoalType; icon: keyof typeof Ionicons.glyphMap; blurb: string }> = [
  { value: 'lose_fat', icon: 'flame', blurb: 'Lean out and drop body fat sustainably' },
  { value: 'build_muscle', icon: 'barbell', blurb: 'Add strength and muscle — get buff' },
  { value: 'recomp', icon: 'sync', blurb: 'Lose fat and build muscle at once' },
  { value: 'maintain', icon: 'heart', blurb: 'Stay healthy and feel your best' },
  { value: 'endurance', icon: 'bicycle', blurb: 'Improve cardio and stamina' },
];

const ACTIVITY_LEVELS: Array<{ value: ActivityLevel; label: string; blurb: string }> = [
  { value: 'sedentary', label: 'Sedentary', blurb: 'Desk job, little exercise' },
  { value: 'light', label: 'Lightly active', blurb: 'Light exercise 1–3 days/wk' },
  { value: 'moderate', label: 'Moderately active', blurb: 'Exercise 3–5 days/wk' },
  { value: 'active', label: 'Very active', blurb: 'Hard exercise 6–7 days/wk' },
  { value: 'athlete', label: 'Athlete', blurb: 'Training twice a day' },
];

const LIFESTYLE: Array<{ value: LifestyleTag; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'busy_job', label: 'Busy job', icon: 'briefcase' },
  { value: 'kids', label: 'Kids at home', icon: 'people' },
  { value: 'travel', label: 'Travel often', icon: 'airplane' },
  { value: 'shift_work', label: 'Shift work', icon: 'moon' },
  { value: 'limited_equipment', label: 'Limited equipment', icon: 'home' },
  { value: 'eats_out', label: 'Eat out a lot', icon: 'restaurant' },
  { value: 'poor_sleep', label: 'Poor sleep', icon: 'bed' },
];

const DIETS = ['high_protein', 'vegetarian', 'vegan', 'pescatarian', 'low_carb', 'mediterranean', 'gluten_free', 'dairy_free'];

const STEPS = ['Welcome', 'You', 'Body', 'Activity', 'Goal', 'Life', 'Plan'];

export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const { setProfile } = useAppStore();
  const [step, setStep] = useState(0);

  const [draft, setDraft] = useState<Draft>({
    displayName: '',
    sex: 'male',
    units: 'imperial',
    heightCm: 178,
    weightKg: 80,
    targetWeightKg: 75,
    age: 30,
    activityLevel: 'moderate',
    preferredActivities: ['gym', 'run'],
    weeklyWorkoutTarget: 4,
    goal: 'recomp',
    lifestyle: [],
    dietaryPreferences: [],
  });

  // Local imperial input buffers
  const [ft, setFt] = useState('5');
  const [inch, setInch] = useState('10');
  const [heightCmStr, setHeightCmStr] = useState('178');
  const [weightStr, setWeightStr] = useState('176');
  const [targetStr, setTargetStr] = useState('165');

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const targets = useMemo(
    () =>
      computeTargets({
        sex: draft.sex,
        weightKg: draft.weightKg,
        heightCm: draft.heightCm,
        age: draft.age,
        activityLevel: draft.activityLevel,
        goal: draft.goal,
      }),
    [draft],
  );

  const commitBody = () => {
    const heightCm =
      draft.units === 'metric'
        ? Number(heightCmStr) || draft.heightCm
        : ftInToCm(Number(ft) || 0, Number(inch) || 0);
    const weightKg = draft.units === 'metric' ? Number(weightStr) || draft.weightKg : lbToKg(Number(weightStr) || 0);
    const targetWeightKg =
      draft.units === 'metric' ? Number(targetStr) || draft.targetWeightKg : lbToKg(Number(targetStr) || 0);
    set({ heightCm, weightKg, targetWeightKg });
  };

  const finish = () => {
    const profile: UserProfile = {
      id: 'local-user',
      displayName: draft.displayName.trim() || 'Athlete',
      sex: draft.sex,
      birthYear: new Date().getFullYear() - draft.age,
      heightCm: draft.heightCm,
      weightKg: draft.weightKg,
      targetWeightKg: draft.targetWeightKg,
      activityLevel: draft.activityLevel,
      goal: draft.goal,
      weeklyWorkoutTarget: draft.weeklyWorkoutTarget,
      preferredActivities: draft.preferredActivities,
      lifestyle: draft.lifestyle,
      dietaryPreferences: draft.dietaryPreferences,
      units: draft.units,
      onboardedAt: new Date().toISOString(),
      targets,
    };
    setProfile(profile);
    router.replace('/(tabs)');
  };

  const next = () => {
    if (step === 2) commitBody();
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canContinue = () => {
    if (step === 1) return draft.displayName.trim().length > 0;
    return true;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
      {/* Progress */}
      <View style={styles.progressWrap}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSeg,
              {
                backgroundColor: i <= step ? theme.colors.brand : theme.colors.cardMuted,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && <StepWelcome />}
        {step === 1 && (
          <View>
            <StepTitle title="Let's get to know you" sub="This tailors everything to you." />
            <Input
              label="What should we call you?"
              placeholder="Your name"
              value={draft.displayName}
              onChangeText={(t) => set({ displayName: t })}
              autoCapitalize="words"
            />
            <Text variant="label" color="textMuted" style={{ marginBottom: 8 }}>
              Sex (for calorie math)
            </Text>
            <View style={styles.rowWrap}>
              {(['male', 'female', 'other'] as Sex[]).map((s) => (
                <Chip key={s} label={s[0].toUpperCase() + s.slice(1)} selected={draft.sex === s} onPress={() => set({ sex: s })} />
              ))}
            </View>
            <Text variant="label" color="textMuted" style={{ marginTop: 20, marginBottom: 8 }}>
              Age
            </Text>
            <Input
              keyboardType="number-pad"
              value={String(draft.age)}
              onChangeText={(t) => set({ age: Math.max(13, Math.min(100, Number(t) || 0)) })}
              suffix="years"
            />
          </View>
        )}
        {step === 2 && (
          <View>
            <StepTitle title="Your body" sub="Used to calculate your energy needs." />
            <View style={[styles.rowWrap, { marginBottom: 16 }]}>
              <Chip label="Imperial (lb/ft)" selected={draft.units === 'imperial'} onPress={() => set({ units: 'imperial' })} />
              <Chip label="Metric (kg/cm)" selected={draft.units === 'metric'} onPress={() => set({ units: 'metric' })} />
            </View>

            {draft.units === 'imperial' ? (
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Input label="Height (ft)" keyboardType="number-pad" value={ft} onChangeText={setFt} suffix="ft" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Input label="Height (in)" keyboardType="number-pad" value={inch} onChangeText={setInch} suffix="in" />
                </View>
              </View>
            ) : (
              <Input label="Height" keyboardType="number-pad" value={heightCmStr} onChangeText={setHeightCmStr} suffix="cm" />
            )}

            <Input
              label="Current weight"
              keyboardType="decimal-pad"
              value={weightStr}
              onChangeText={setWeightStr}
              suffix={draft.units === 'metric' ? 'kg' : 'lb'}
            />
            <Input
              label="Target weight (optional)"
              keyboardType="decimal-pad"
              value={targetStr}
              onChangeText={setTargetStr}
              suffix={draft.units === 'metric' ? 'kg' : 'lb'}
            />
          </View>
        )}
        {step === 3 && (
          <View>
            <StepTitle title="How active are you?" sub="Pick what fits a typical week." />
            {ACTIVITY_LEVELS.map((a) => (
              <SelectRow
                key={a.value}
                title={a.label}
                sub={a.blurb}
                selected={draft.activityLevel === a.value}
                onPress={() => set({ activityLevel: a.value })}
              />
            ))}
            <Text variant="subtitle" style={{ marginTop: 24, marginBottom: 12 }}>
              Which do you enjoy?
            </Text>
            <View style={styles.rowWrap}>
              {ACTIVITY_LIST.map((a) => (
                <Chip
                  key={a.type}
                  label={a.label}
                  icon={a.icon}
                  selected={draft.preferredActivities.includes(a.type)}
                  onPress={() => set({ preferredActivities: toggle(draft.preferredActivities, a.type) })}
                />
              ))}
            </View>
            <Text variant="subtitle" style={{ marginTop: 24, marginBottom: 8 }}>
              Workouts per week
            </Text>
            <View style={styles.rowWrap}>
              {[2, 3, 4, 5, 6].map((n) => (
                <Chip
                  key={n}
                  label={`${n}`}
                  selected={draft.weeklyWorkoutTarget === n}
                  onPress={() => set({ weeklyWorkoutTarget: n })}
                />
              ))}
            </View>
          </View>
        )}
        {step === 4 && (
          <View>
            <StepTitle title="What's your main goal?" sub="Your coach optimizes around this." />
            {GOALS.map((g) => (
              <SelectRow
                key={g.value}
                icon={g.icon}
                title={goalLabel(g.value)}
                sub={g.blurb}
                selected={draft.goal === g.value}
                onPress={() => set({ goal: g.value })}
              />
            ))}
          </View>
        )}
        {step === 5 && (
          <View>
            <StepTitle title="Your real life" sub="So plans flex around your schedule — no rigid routines." />
            <View style={styles.rowWrap}>
              {LIFESTYLE.map((l) => (
                <Chip
                  key={l.value}
                  label={l.label}
                  icon={l.icon}
                  selected={draft.lifestyle.includes(l.value)}
                  onPress={() => set({ lifestyle: toggle(draft.lifestyle, l.value) })}
                />
              ))}
            </View>
            <Text variant="subtitle" style={{ marginTop: 24, marginBottom: 12 }}>
              Dietary preferences
            </Text>
            <View style={styles.rowWrap}>
              {DIETS.map((d) => (
                <Chip
                  key={d}
                  label={d.replace(/_/g, ' ')}
                  selected={draft.dietaryPreferences.includes(d)}
                  onPress={() => set({ dietaryPreferences: toggle(draft.dietaryPreferences, d) })}
                />
              ))}
            </View>
          </View>
        )}
        {step === 6 && (
          <View>
            <StepTitle title="Your starting plan" sub={`Tuned for ${goalLabel(draft.goal).toLowerCase()}.`} />
            <Card style={{ marginBottom: 16 }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text variant="display" color="brand">
                    {targets.calories}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    daily calories target
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.colors.brandSoft }]}>
                  <Ionicons name="sparkles" size={16} color={theme.colors.brand} />
                  <Text variant="caption" style={{ color: theme.colors.brand, marginLeft: 6 }}>
                    Personalized
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 16 }}>
                <MacroBar label="Protein" value={targets.proteinG} target={targets.proteinG} color={theme.colors.protein} />
                <MacroBar label="Carbs" value={targets.carbsG} target={targets.carbsG} color={theme.colors.carbs} />
                <MacroBar label="Fat" value={targets.fatG} target={targets.fatG} color={theme.colors.fat} />
              </View>
            </Card>
            <Card muted>
              <Text variant="label" style={{ marginBottom: 6 }}>
                How Apexia will help
              </Text>
              <BulletLine text="Daily meals, workouts & supplements tuned to your goal" />
              <BulletLine text="Snap a photo of any meal or label to log nutrition" />
              <BulletLine text="Plans flex around busy days — progress over perfection" />
            </Card>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <View style={styles.footerRow}>
          {step > 0 ? (
            <Button label="Back" variant="ghost" onPress={back} fullWidth={false} style={{ marginRight: 12 }} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Button
              label={step === 0 ? 'Get started' : step === STEPS.length - 1 ? 'Start my journey' : 'Continue'}
              onPress={next}
              disabled={!canContinue()}
              iconRight={step === STEPS.length - 1 ? 'rocket' : 'arrow-forward'}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function StepWelcome() {
  const theme = useTheme();
  return (
    <View style={{ paddingVertical: 24 }}>
      <View style={[styles.logo, { backgroundColor: theme.colors.brand }]}>
        <Ionicons name="triangle" size={38} color={theme.colors.onBrand} />
      </View>
      <Text variant="display" style={{ marginTop: 24 }}>
        Welcome to Apexia
      </Text>
      <Text color="textMuted" style={{ marginTop: 8, fontSize: 16, lineHeight: 24 }}>
        Your AI coach for a fit, healthy life that fits a hectic schedule. Track workouts, snap your meals, analyze
        supplements — and get daily guidance built around your goals.
      </Text>
      <View style={{ marginTop: 28 }}>
        <FeatureLine icon="barbell" title="Track any workout" sub="Gym, runs, cycling, reformer pilates & more" />
        <FeatureLine icon="camera" title="Photo food logging" sub="Read labels or estimate a whole plate" />
        <FeatureLine icon="flask" title="Smart supplements" sub="Analyze and log what actually helps" />
        <FeatureLine icon="sparkles" title="Your AI coach" sub="Meals, training & supplements, daily" />
      </View>
    </View>
  );
}

function FeatureLine({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  const theme = useTheme();
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: theme.colors.brandSoft }]}>
        <Ionicons name={icon} size={20} color={theme.colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="label">{title}</Text>
        <Text variant="caption" color="textMuted">
          {sub}
        </Text>
      </View>
    </View>
  );
}

function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text variant="title">{title}</Text>
      {sub ? (
        <Text color="textMuted" style={{ marginTop: 6, lineHeight: 20 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function SelectRow({
  title,
  sub,
  selected,
  onPress,
  icon,
}: {
  title: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectRow,
        {
          backgroundColor: selected ? theme.colors.brandSoft : theme.colors.card,
          borderColor: selected ? theme.colors.brand : theme.colors.border,
          opacity: pressed ? 0.9 : 1,
          ...(theme.mode === 'light' ? theme.shadow.card : {}),
        },
      ]}
    >
      {icon ? (
        <View style={[styles.selectIcon, { backgroundColor: selected ? theme.colors.brand : theme.colors.cardMuted }]}>
          <Ionicons name={icon} size={20} color={selected ? theme.colors.onBrand : theme.colors.textMuted} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="label">{title}</Text>
        <Text variant="caption" color="textMuted">
          {sub}
        </Text>
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={selected ? theme.colors.brand : theme.colors.textFaint}
      />
    </Pressable>
  );
}

function BulletLine({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 }}>
      <Ionicons name="checkmark-circle" size={18} color={theme.colors.brand} style={{ marginRight: 8, marginTop: 1 }} />
      <Text style={{ flex: 1 }} color="textMuted">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  progressWrap: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  progressSeg: { flex: 1, height: 5, borderRadius: 999 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  selectIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
});
