import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components';
import { analyzeBodyScan, type BodyScanContext } from '@/lib/api';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { BodyScanResult } from '@/types';
import { relativeDay } from '@/utils/date';
import { exerciseKey } from '@/utils/strength';

type Pose = 'front' | 'side' | 'back';
type Photo = { uri: string; base64: string };
type Phase = 'capture' | 'analyzing' | 'result';

const POSES: { key: Pose; label: string }[] = [
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'back', label: 'Back' },
];

export default function BodyScan() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, weightLogs, exerciseHistory, workouts, foods, gymEquipmentIds, homeEquipmentIds, customEquipment, bodyScans, addBodyScan } =
    useAppStore();

  const [photos, setPhotos] = useState<Partial<Record<Pose, Photo>>>({});
  const [phase, setPhase] = useState<Phase>('capture');
  const [result, setResult] = useState<BodyScanResult | null>(bodyScans[0]?.result ?? null);

  const hasAnyPhoto = Object.values(photos).some(Boolean);

  const setPhoto = async (pose: Pose, fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera', 'Enable camera access in Settings to take progress photos.');
          return;
        }
      }
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, cameraType: ImagePicker.CameraType.back })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5, mediaTypes: ['images'] });
      if (!res.canceled && res.assets[0]?.base64) {
        setPhotos((p) => ({ ...p, [pose]: { uri: res.assets[0].uri, base64: res.assets[0].base64 as string } }));
      }
    } catch {
      // ignore
    }
  };

  const choose = (pose: Pose) => {
    const options = [
      { text: 'Take photo', onPress: () => setPhoto(pose, true) },
      { text: 'Choose from library', onPress: () => setPhoto(pose, false) },
      ...(photos[pose] ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => setPhotos((p) => ({ ...p, [pose]: undefined })) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ];
    Alert.alert(`${pose[0].toUpperCase() + pose.slice(1)} photo`, 'Add a progress photo (kept on your device).', options);
  };

  const context = useMemo<BodyScanContext>(() => {
    const wSorted = [...weightLogs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
    const startKg = wSorted[0]?.weightKg;
    const currentKg = wSorted[wSorted.length - 1]?.weightKg ?? profile?.weightKg;
    const topLifts = Object.values(exerciseHistory)
      .filter((r) => (r.bestWeightKg ?? 0) > 0)
      .sort((a, b) => (b.bestWeightKg ?? 0) - (a.bestWeightKg ?? 0))
      .slice(0, 6)
      .map((r) => ({ name: r.name, bestKg: r.bestWeightKg, sessions: r.sessions }));
    const cutoff = Date.now() - 30 * 86_400_000;
    const workoutsLast30 = workouts.filter((w) => new Date(w.performedAt).getTime() >= cutoff).length;

    // avg calories/protein over the last 7 days that have entries
    const days = new Map<string, { cal: number; pro: number }>();
    const since = Date.now() - 7 * 86_400_000;
    for (const f of foods) {
      if (new Date(f.loggedAt).getTime() < since) continue;
      const key = f.loggedAt.slice(0, 10);
      const d = days.get(key) ?? { cal: 0, pro: 0 };
      d.cal += f.nutrients.calories * f.servings;
      d.pro += f.nutrients.proteinG * f.servings;
      days.set(key, d);
    }
    let nutritionAvg: BodyScanContext['nutritionAvg'] = null;
    if (days.size > 0) {
      const totals = [...days.values()].reduce((a, b) => ({ cal: a.cal + b.cal, pro: a.pro + b.pro }), { cal: 0, pro: 0 });
      nutritionAvg = { calories: Math.round(totals.cal / days.size), proteinG: Math.round(totals.pro / days.size) };
    }

    const allEquip = [...customEquipment];
    const ids = new Set([...gymEquipmentIds, ...homeEquipmentIds]);
    const catalogNames: string[] = [];
    return {
      weight: {
        startKg,
        currentKg,
        targetKg: profile?.targetWeightKg,
        changeKg: startKg != null && currentKg != null ? currentKg - startKg : undefined,
      },
      topLifts,
      workoutsLast30,
      nutritionAvg,
      equipment: [...allEquip.filter((e) => ids.has(e.id)).map((e) => e.name), ...catalogNames],
    };
  }, [weightLogs, profile, exerciseHistory, workouts, foods, gymEquipmentIds, homeEquipmentIds, customEquipment]);

  const analyze = async () => {
    setPhase('analyzing');
    const images = POSES.map((p) => photos[p.key]?.base64).filter(Boolean) as string[];
    try {
      const res = await analyzeBodyScan({ images, profile, context });
      setResult(res);
      addBodyScan(res);
    } catch {
      // keep previous result if any
    } finally {
      setPhase('result');
    }
  };

  if (phase === 'analyzing') {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.brand} />
        <Text variant="subtitle" style={{ marginTop: 16 }}>
          Analyzing your physique…
        </Text>
        <Text color="textMuted" style={{ marginTop: 6 }}>
          Combining your photos with your goals & data
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>
          Body scan
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {phase === 'result' && result ? (
          <BodyReport result={result} onNew={() => setPhase('capture')} />
        ) : (
          <>
            <Text color="textMuted" style={{ lineHeight: 20 }}>
              Add progress photos and Apexia builds a detailed, personalized assessment from your goals, weight trend,
              lifts, and nutrition — a trainer in your pocket.
            </Text>

            <View style={styles.poses}>
              {POSES.map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => choose(p.key)}
                  style={[styles.poseSlot, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                >
                  {photos[p.key] ? (
                    <Image source={{ uri: photos[p.key]!.uri }} style={styles.poseImg} contentFit="cover" />
                  ) : (
                    <>
                      <Ionicons name="add" size={24} color={theme.colors.textFaint} />
                    </>
                  )}
                  <Text variant="caption" color={photos[p.key] ? 'brand' : 'textMuted'} style={styles.poseLabel}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Card muted style={{ marginTop: 4 }}>
              <View style={styles.row}>
                <Ionicons name="lock-closed" size={16} color={theme.colors.textMuted} />
                <Text variant="caption" color="textMuted" style={{ marginLeft: 8, flex: 1 }}>
                  Photos stay on your device — only the written assessment is saved.
                </Text>
              </View>
            </Card>

            <Button
              label="Analyze my physique"
              icon="sparkles"
              onPress={analyze}
              disabled={!hasAnyPhoto}
              style={{ marginTop: 16 }}
            />

            {result ? (
              <Pressable onPress={() => setPhase('result')} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.brand }}>View last assessment</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BodyReport({ result, onNew }: { result: BodyScanResult; onNew: () => void }) {
  const theme = useTheme();
  return (
    <View>
      <Card>
        <View style={styles.row}>
          <Ionicons name="body" size={20} color={theme.colors.brand} />
          <Text variant="subtitle" style={{ marginLeft: 8, flex: 1 }}>
            Assessment
          </Text>
          <Text variant="caption" color="textFaint">
            {Math.round(result.confidence * 100)}%
          </Text>
        </View>
        <Text style={{ marginTop: 10, lineHeight: 21 }}>{result.summary}</Text>
        {result.estimatedComposition ? (
          <Text variant="caption" color="textMuted" style={{ marginTop: 8 }}>
            {result.estimatedComposition}
          </Text>
        ) : null}
      </Card>

      <ReportList title="Focus areas" icon="locate">
        {result.focusAreas.map((f, i) => (
          <View key={i} style={{ marginBottom: 12 }}>
            <Text variant="label">{f.area}</Text>
            <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
              {f.observation}
            </Text>
            <Text variant="caption" style={{ color: theme.colors.brand, marginTop: 2 }}>
              → {f.action}
            </Text>
          </View>
        ))}
      </ReportList>

      <ReportBullets title="Training plan" icon="barbell" items={result.training} />
      <ReportBullets title="Nutrition" icon="restaurant" items={result.nutrition} />
      <ReportBullets title="Milestones" icon="flag" items={result.milestones} />

      {result.encouragement ? (
        <Card style={{ marginTop: 12, backgroundColor: theme.colors.brandSoft }} elevated={false}>
          <Text style={{ color: theme.colors.brandDark, lineHeight: 21 }}>{result.encouragement}</Text>
        </Card>
      ) : null}

      {result.disclaimer ? (
        <Text variant="caption" color="textFaint" style={{ marginTop: 12, lineHeight: 16 }}>
          {result.disclaimer}
        </Text>
      ) : null}

      <Button label="New scan" icon="camera" variant="secondary" onPress={onNew} style={{ marginTop: 16 }} />
    </View>
  );
}

function ReportList({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Card style={{ marginTop: 12 }}>
      <View style={[styles.row, { marginBottom: 12 }]}>
        <Ionicons name={icon} size={18} color={theme.colors.brand} />
        <Text variant="label" style={{ marginLeft: 8 }}>
          {title}
        </Text>
      </View>
      {children}
    </Card>
  );
}

function ReportBullets({ title, icon, items }: { title: string; icon: keyof typeof Ionicons.glyphMap; items: string[] }) {
  const theme = useTheme();
  if (!items || items.length === 0) return null;
  return (
    <Card style={{ marginTop: 12 }}>
      <View style={[styles.row, { marginBottom: 8 }]}>
        <Ionicons name={icon} size={18} color={theme.colors.brand} />
        <Text variant="label" style={{ marginLeft: 8 }}>
          {title}
        </Text>
      </View>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', marginTop: 6 }}>
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.brand} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={{ flex: 1 }} color="textMuted">
            {it}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  poses: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 12 },
  poseSlot: { flex: 1, aspectRatio: 0.7, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  poseImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  poseLabel: { position: 'absolute', bottom: 8 },
});
