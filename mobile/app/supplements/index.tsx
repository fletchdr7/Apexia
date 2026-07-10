import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, SectionHeader, Text } from '@/components';
import { COMMON_SUPPLEMENTS, GOAL_SUPPLEMENT_HINTS } from '@/constants/supplements';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import { isSameDay, timeLabel } from '@/utils/date';
import { goalLabel } from '@/utils/nutrition';

export default function Supplements() {
  const theme = useTheme();
  const router = useRouter();
  const { supplements, supplementLogs, addSupplement, removeSupplement, logSupplement, profile } = useAppStore();

  const goal = profile?.goal ?? 'maintain';
  const recommended = GOAL_SUPPLEMENT_HINTS[goal];
  const todaysLogs = supplementLogs.filter((l) => isSameDay(l.takenAt));

  const suggestions = COMMON_SUPPLEMENTS.filter(
    (c) => recommended.includes(c.name) && !supplements.some((s) => s.name === c.name),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>
          Supplements
        </Text>
        <Button label="Analyze" icon="camera" onPress={() => router.push('/supplements/analyze')} fullWidth={false} size="sm" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16 }}>
          <Card muted>
            <View style={styles.row}>
              <Ionicons name="sparkles" size={18} color={theme.colors.brand} />
              <Text variant="label" style={{ marginLeft: 8 }}>
                Tuned for {goalLabel(goal).toLowerCase()}
              </Text>
            </View>
            <Text variant="caption" color="textMuted" style={{ marginTop: 6 }}>
              Snap a label to analyze any supplement, or add a recommended one below.
            </Text>
          </Card>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Today" />
          {todaysLogs.length === 0 ? (
            <Text variant="caption" color="textFaint">
              Nothing taken yet today.
            </Text>
          ) : (
            todaysLogs.map((l) => (
              <View key={l.id} style={styles.logRow}>
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.brand} style={{ marginRight: 10 }} />
                <Text style={{ flex: 1 }}>{l.supplementName}</Text>
                <Text variant="caption" color="textFaint">
                  {l.dose} · {timeLabel(l.takenAt)}
                </Text>
              </View>
            ))
          )}

          <SectionHeader title="My stack" />
          {supplements.length === 0 ? (
            <EmptyState
              icon="flask"
              title="No supplements yet"
              message="Analyze a label with your camera or add a recommended supplement."
              actionLabel="Analyze a label"
              onAction={() => router.push('/supplements/analyze')}
            />
          ) : (
            supplements.map((s) => (
              <Card key={s.id} style={{ marginBottom: 10 }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text variant="label">{s.name}</Text>
                    {s.purpose ? (
                      <Text variant="caption" color="textMuted">
                        {s.purpose}
                      </Text>
                    ) : null}
                  </View>
                  {s.goalFit != null ? (
                    <View style={[styles.fit, { backgroundColor: theme.colors.brandSoft }]}>
                      <Text variant="caption" style={{ color: theme.colors.brand }}>
                        {Math.round(s.goalFit * 100)}% fit
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.actionsRow}>
                  <Button label="Log dose" icon="add" size="sm" onPress={() => logSupplement(s)} fullWidth={false} />
                  <Pressable onPress={() => removeSupplement(s.id)} hitSlop={8} style={{ marginLeft: 12 }}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.textFaint} />
                  </Pressable>
                </View>
              </Card>
            ))
          )}

          {suggestions.length > 0 ? (
            <>
              <SectionHeader title="Recommended for you" />
              {suggestions.map((s, i) => (
                <Card key={i} style={{ marginBottom: 10 }} muted>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text variant="label">{s.name}</Text>
                      <Text variant="caption" color="textMuted">
                        {s.purpose}
                      </Text>
                    </View>
                    <Button
                      label="Add"
                      size="sm"
                      variant="secondary"
                      fullWidth={false}
                      onPress={() => addSupplement(s)}
                    />
                  </View>
                </Card>
              ))}
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  fit: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
});
