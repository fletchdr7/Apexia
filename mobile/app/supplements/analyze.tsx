import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input, Text } from '@/components';
import { analyzeSupplementForGoal, analyzeSupplementPhoto, lookupSupplement } from '@/lib/api';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { Supplement } from '@/types';
import { supplementHasMacros, supplementNutrients } from '@/utils/nutrition';

type Phase = 'capture' | 'analyzing' | 'result';

export default function AnalyzeSupplement() {
  const theme = useTheme();
  const router = useRouter();
  const { addSupplement, profile } = useAppStore();
  const params = useLocalSearchParams<{ mode?: string }>();
  const manual = params.mode === 'manual';
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const emptyResult: Omit<Supplement, 'id'> = { name: '', form: 'capsule', ingredients: [] };
  const [phase, setPhase] = useState<Phase>(manual ? 'result' : 'capture');
  const [result, setResult] = useState<Omit<Supplement, 'id'>>(manual ? emptyResult : emptyResult);
  const [looking, setLooking] = useState(false);

  const analysis = result.name && result.name !== 'Unknown supplement' ? analyzeSupplementForGoal(result, profile) : null;

  const setName = (name: string) => setResult((r) => ({ ...r, name }));

  const doLookup = async () => {
    const nm = result.name.trim();
    if (!nm) return;
    setLooking(true);
    try {
      const res = await lookupSupplement(nm);
      setResult({ ...res, goalFit: analyzeSupplementForGoal(res, profile).goalFit });
    } catch {
      // keep current
    } finally {
      setLooking(false);
    }
  };

  const run = async (base64: string) => {
    setPhase('analyzing');
    try {
      const res = await analyzeSupplementPhoto(base64);
      setResult({ ...res, goalFit: analyzeSupplementForGoal(res, profile).goalFit });
    } catch {
      setResult({ name: 'Unknown supplement', form: 'capsule', ingredients: [] });
    } finally {
      setPhase('result');
    }
  };

  const capture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
    await run(photo?.base64 ?? '');
  };

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ['images'] });
    if (!res.canceled && res.assets[0]) await run(res.assets[0].base64 ?? '');
  };

  const addToStack = () => {
    if (!result.name.trim()) return;
    addSupplement(result);
    router.back();
  };

  if (phase === 'capture') {
    if (!permission) {
      return (
        <View style={[styles.fill, styles.center, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <SafeAreaView style={[styles.fill, { backgroundColor: theme.colors.background }]}>
          <Header title="Analyze supplement" onClose={() => router.back()} />
          <View style={styles.center}>
            <Ionicons name="flask" size={48} color={theme.colors.brand} />
            <Text variant="subtitle" center style={{ marginTop: 16 }}>
              Camera access needed
            </Text>
            <Text color="textMuted" center style={{ marginTop: 8, maxWidth: 280 }}>
              Point your camera at a supplement label to read its ingredients and get an analysis for your goal.
            </Text>
            <Button label="Enable camera" onPress={requestPermission} fullWidth={false} style={{ marginTop: 20 }} />
            <Button label="Pick from library" variant="ghost" onPress={pick} fullWidth={false} style={{ marginTop: 10 }} />
          </View>
        </SafeAreaView>
      );
    }
    return (
      <View style={styles.fill}>
        <CameraView ref={cameraRef} style={styles.fill} facing="back" />
        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
          <Header title="Analyze supplement" onClose={() => router.back()} light />
          <View style={styles.center}>
            <View style={styles.reticle} />
            <Text style={{ color: 'white', marginTop: 12 }}>Frame the ingredients label</Text>
          </View>
          <View style={styles.controls}>
            <Pressable onPress={pick} style={styles.libraryBtn}>
              <Ionicons name="images" size={24} color="white" />
            </Pressable>
            <Pressable onPress={capture} style={styles.shutter}>
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={{ width: 52 }} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (phase === 'analyzing') {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.brand} />
        <Text variant="subtitle" style={{ marginTop: 16 }}>
          Reading the label…
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <Header title={manual ? 'Add supplement' : 'Analysis'} onClose={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <>
            <Card>
              <Input
                label="Supplement name"
                value={result.name === 'Unknown supplement' ? '' : result.name}
                onChangeText={setName}
                placeholder="e.g. Magnesium Glycinate"
                autoCapitalize="words"
              />
              <Button
                label="Look up details"
                icon="search"
                variant="secondary"
                onPress={doLookup}
                loading={looking}
                disabled={!result.name.trim() || result.name === 'Unknown supplement'}
              />
              {result.name === 'Unknown supplement' ? (
                <Text variant="caption" color="textMuted" style={{ marginTop: 8 }}>
                  Couldn&apos;t identify the label — type the name above and tap Look up.
                </Text>
              ) : null}
              {result.purpose ? (
                <Text color="textMuted" style={{ marginTop: 10 }}>
                  {result.purpose}
                </Text>
              ) : null}
              {analysis ? (
                <View style={[styles.fit, { alignSelf: 'flex-start', marginTop: 10, backgroundColor: theme.colors.brandSoft }]}>
                  <Text variant="caption" style={{ color: theme.colors.brand }}>
                    {Math.round(analysis.goalFit * 100)}% fit · {analysis.verdict}
                  </Text>
                </View>
              ) : null}
            </Card>

            {supplementHasMacros(result) ? (
              <Card style={{ marginTop: 12 }}>
                <Text variant="label" style={{ marginBottom: 8 }}>
                  Counts toward your day (per serving)
                </Text>
                {(() => {
                  const n = supplementNutrients(result);
                  return (
                    <View style={styles.macroRow}>
                      <Macro label="Cal" value={Math.round(n.calories)} />
                      <Macro label="Protein" value={`${Math.round(n.proteinG)}g`} />
                      <Macro label="Carbs" value={`${Math.round(n.carbsG)}g`} />
                      <Macro label="Fat" value={`${Math.round(n.fatG)}g`} />
                    </View>
                  );
                })()}
                <Text variant="caption" color="textFaint" style={{ marginTop: 8 }}>
                  Logging a dose adds these to your nutrition totals.
                </Text>
              </Card>
            ) : null}

            {result.ingredients.length > 0 ? (
              <Card style={{ marginTop: 12 }}>
                <Text variant="label" style={{ marginBottom: 8 }}>
                  Ingredients
                </Text>
                {result.ingredients.map((ing, i) => (
                  <View key={i} style={styles.ingRow}>
                    <Text style={{ flex: 1 }}>{ing.name}</Text>
                    <Text variant="caption" color="textMuted">
                      {ing.amount} {ing.unit}
                      {ing.dailyValuePct ? ` (${ing.dailyValuePct}% DV)` : ''}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}

            {result.benefits?.length ? (
              <InfoCard title="Benefits" icon="checkmark-circle" color={theme.colors.success} items={result.benefits} />
            ) : null}
            {result.cautions?.length ? (
              <InfoCard title="Cautions" icon="warning" color={theme.colors.warning} items={result.cautions} />
            ) : null}
            {result.timing ? (
              <Card style={{ marginTop: 12 }}>
                <Text variant="label">Best timing</Text>
                <Text color="textMuted" style={{ marginTop: 4 }}>
                  {result.timing}
                </Text>
              </Card>
            ) : null}
          </>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button label={manual ? 'Scan' : 'Rescan'} variant="secondary" onPress={() => setPhase('capture')} />
          <View style={{ flex: 1 }}>
            <Button label="Add to my stack" icon="add" onPress={addToStack} disabled={!result.name.trim()} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Header({ title, onClose, light }: { title: string; onClose: () => void; light?: boolean }) {
  const theme = useTheme();
  const color = light ? 'white' : theme.colors.text;
  return (
    <View style={styles.header}>
      <Text variant="heading" style={{ color }}>
        {title}
      </Text>
      <Pressable
        onPress={onClose}
        hitSlop={16}
        style={[styles.closeBtn, { backgroundColor: light ? 'rgba(0,0,0,0.45)' : theme.colors.cardMuted }]}
      >
        <Ionicons name="close" size={24} color={color} />
      </Pressable>
    </View>
  );
}

function Macro({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.macroItem}>
      <Text variant="subtitle">{value}</Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

function InfoCard({
  title,
  icon,
  color,
  items,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  items: string[];
}) {
  return (
    <Card style={{ marginTop: 12 }}>
      <View style={styles.rowBetween}>
        <Text variant="label">{title}</Text>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', marginTop: 8 }}>
          <Text style={{ color, marginRight: 8 }}>•</Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', zIndex: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, zIndex: 20 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reticle: { width: 280, height: 200, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40, paddingBottom: 10 },
  libraryBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'white' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fit: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { flex: 1, alignItems: 'center' },
  ingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
