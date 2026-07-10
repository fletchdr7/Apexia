import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Screen, SectionHeader, Text } from '@/components';
import { config } from '@/lib/config';
import { useAppStore } from '@/store/AppStore';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/theme';
import { goalLabel } from '@/utils/nutrition';
import { formatHeight, formatWeight } from '@/utils/units';

export default function Profile() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, resetAll, supplements, updateProfile } = useAppStore();
  const { configured, session, email, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  if (!profile) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  const age = new Date().getFullYear() - profile.birthYear;

  const confirmReset = () => {
    Alert.alert('Reset Apexia?', 'This clears your profile and all logged data on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetAll();
          router.replace('/(onboarding)');
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.brand }]}>
          <Text style={{ color: theme.colors.onBrand, fontWeight: '800', fontSize: 26 }}>
            {profile.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text variant="title">{profile.displayName}</Text>
          <Text color="textMuted">{goalLabel(profile.goal)}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <Metric label="Age" value={`${age}`} />
        <Metric label="Weight" value={formatWeight(profile.weightKg, profile.units)} />
        <Metric label="Height" value={formatHeight(profile.heightCm, profile.units)} />
        {profile.targetWeightKg ? <Metric label="Target" value={formatWeight(profile.targetWeightKg, profile.units)} /> : null}
      </View>

      <SectionHeader title="Daily targets" />
      <Card>
        <TargetRow label="Calories" value={`${profile.targets.calories} kcal`} color={theme.colors.calories} />
        <TargetRow label="Protein" value={`${profile.targets.proteinG} g`} color={theme.colors.protein} />
        <TargetRow label="Carbs" value={`${profile.targets.carbsG} g`} color={theme.colors.carbs} />
        <TargetRow label="Fat" value={`${profile.targets.fatG} g`} color={theme.colors.fat} />
        <TargetRow label="Water" value={`${(profile.targets.waterMl / 1000).toFixed(1)} L`} color={theme.colors.info} last />
      </Card>

      <SectionHeader title="Manage" />
      <Card padded={false}>
        <LinkRow icon="flask" label="Supplements" onPress={() => router.push('/supplements')} />
        <LinkRow icon="barbell" label="Workout history" onPress={() => router.push('/(tabs)/workouts')} />
        <LinkRow icon="restaurant" label="Nutrition log" onPress={() => router.push('/(tabs)/nutrition')} last />
      </Card>

      <SectionHeader title="Preferences" />
      <Card>
        <Text variant="label" style={{ marginBottom: 8 }}>
          Units
        </Text>
        <View style={styles.tags}>
          <Chip label="Imperial (lb)" selected={profile.units === 'imperial'} onPress={() => updateProfile({ units: 'imperial' })} />
          <Chip label="Metric (kg)" selected={profile.units === 'metric'} onPress={() => updateProfile({ units: 'metric' })} />
        </View>
        <Text variant="label" style={{ marginTop: 16, marginBottom: 8 }}>
          Lifestyle
        </Text>
        <View style={styles.tags}>
          {profile.lifestyle.length ? (
            profile.lifestyle.map((l) => (
              <View key={l} style={[styles.tag, { backgroundColor: theme.colors.cardMuted }]}>
                <Text variant="caption">{l.replace(/_/g, ' ')}</Text>
              </View>
            ))
          ) : (
            <Text variant="caption" color="textFaint">
              None set
            </Text>
          )}
        </View>
        {profile.dietaryPreferences.length ? (
          <>
            <Text variant="label" style={{ marginTop: 16, marginBottom: 8 }}>
              Diet
            </Text>
            <View style={styles.tags}>
              {profile.dietaryPreferences.map((d) => (
                <View key={d} style={[styles.tag, { backgroundColor: theme.colors.cardMuted }]}>
                  <Text variant="caption">{d.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </Card>

      {configured ? (
        <>
          <SectionHeader title="Account" />
          <Card>
            {session ? (
              <>
                <View style={styles.aboutRow}>
                  <Text color="textMuted">Signed in as</Text>
                  <Text variant="label">{email}</Text>
                </View>
                <View style={[styles.aboutRow, { marginBottom: 12 }]}>
                  <Text color="textMuted">Cloud sync</Text>
                  <Text variant="label" style={{ color: theme.colors.success }}>
                    On
                  </Text>
                </View>
                <Button label="Sign out" variant="secondary" icon="log-out-outline" onPress={handleSignOut} />
              </>
            ) : (
              <>
                <Text color="textMuted" style={{ marginBottom: 12 }}>
                  Sign in to back up your data and sync it across devices.
                </Text>
                <Button
                  label="Sign in / Create account"
                  icon="cloud-upload-outline"
                  onPress={() => router.push('/(auth)/sign-in')}
                />
              </>
            )}
          </Card>
        </>
      ) : null}

      <SectionHeader title="About" />
      <Card>
        <View style={styles.aboutRow}>
          <Text color="textMuted">Supplements tracked</Text>
          <Text variant="label">{supplements.length}</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text color="textMuted">Backend</Text>
          <Text variant="label">{config.hasSupabase ? 'Supabase' : 'Local (demo)'}</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text color="textMuted">AI coach</Text>
          <Text variant="label">{config.hasAiBackend ? 'Connected' : 'Local heuristics'}</Text>
        </View>
      </Card>

      <Pressable onPress={confirmReset} style={styles.reset}>
        <Ionicons name="refresh" size={18} color={theme.colors.danger} />
        <Text style={{ color: theme.colors.danger, marginLeft: 8, fontWeight: '600' }}>Reset all data</Text>
      </Pressable>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text variant="subtitle">{value}</Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

function TargetRow({ label, value, color, last }: { label: string; value: string; color: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.targetRow, !last && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text>{label}</Text>
      </View>
      <Text variant="label">{value}</Text>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.linkRow, !last && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
    >
      <Ionicons name={icon} size={20} color={theme.colors.textMuted} style={{ marginRight: 14 }} />
      <Text style={{ flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  avatar: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  metric: { alignItems: 'center', flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  linkRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  reset: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28, padding: 12 },
});
