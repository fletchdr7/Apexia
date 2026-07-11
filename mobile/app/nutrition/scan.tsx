import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Input, Text } from '@/components';
import { analyzeFoodPhoto } from '@/lib/api';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { FoodScanResult, MealSlot } from '@/types';
import { defaultSlotForNow } from '@/utils/meal';

type Phase = 'capture' | 'analyzing' | 'result';
type Mode = 'plate' | 'label';

export default function ScanFood() {
  const theme = useTheme();
  const router = useRouter();
  const { addFood, dateStamp } = useAppStore();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<Mode>('plate');
  const [phase, setPhase] = useState<Phase>('capture');
  const [result, setResult] = useState<FoodScanResult | null>(null);
  const [slot, setSlot] = useState<MealSlot>(defaultSlotForNow());
  const [servings, setServings] = useState('1');

  const runAnalysis = async (base64: string) => {
    setPhase('analyzing');
    try {
      const res = await analyzeFoodPhoto(base64, mode);
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setPhase('result');
    }
  };

  const capture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
    await runAnalysis(photo?.base64 ?? '');
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ['images'] });
    if (!res.canceled && res.assets[0]) {
      await runAnalysis(res.assets[0].base64 ?? '');
    }
  };

  const confirm = () => {
    if (!result) return;
    const s = Number(servings) || 1;
    addFood({
      name: result.name,
      slot,
      loggedAt: dateStamp(),
      servings: s,
      nutrients: result.total,
      source: mode === 'label' ? 'label_scan' : 'plate_scan',
      confidence: result.confidence,
    });
    router.back();
  };

  // Permission gate
  if (phase === 'capture') {
    if (!permission) {
      return <Centered><ActivityIndicator color={theme.colors.brand} /></Centered>;
    }
    if (!permission.granted) {
      return (
        <SafeAreaView style={[styles.fill, { backgroundColor: theme.colors.background }]}>
          <Header title="Scan food" onClose={() => router.back()} />
          <View style={styles.permission}>
            <Ionicons name="camera" size={48} color={theme.colors.brand} />
            <Text variant="subtitle" center style={{ marginTop: 16 }}>
              Camera access needed
            </Text>
            <Text color="textMuted" center style={{ marginTop: 8, maxWidth: 280 }}>
              Apexia uses the camera to read nutrition labels and estimate the nutrition of cooked meals.
            </Text>
            <Button label="Enable camera" onPress={requestPermission} fullWidth={false} style={{ marginTop: 20 }} />
            <Button label="Pick from library instead" variant="ghost" onPress={pickImage} fullWidth={false} style={{ marginTop: 10 }} />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <View style={styles.fill}>
        <CameraView ref={cameraRef} style={styles.fill} facing="back" />
        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
          <Header title="Scan food" onClose={() => router.back()} light />
          <View style={styles.modeSwitch}>
            <ModePill label="Plate" icon="restaurant" active={mode === 'plate'} onPress={() => setMode('plate')} />
            <ModePill label="Label" icon="barcode" active={mode === 'label'} onPress={() => setMode('label')} />
          </View>
          <View style={styles.reticleWrap}>
            <View style={styles.reticle} />
            <Text style={{ color: 'white', marginTop: 12 }} center>
              {mode === 'plate' ? 'Frame your whole plate' : 'Frame the nutrition label'}
            </Text>
          </View>
          <View style={styles.controls}>
            <Pressable onPress={pickImage} style={styles.libraryBtn}>
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
      <Centered>
        <ActivityIndicator size="large" color={theme.colors.brand} />
        <Text variant="subtitle" style={{ marginTop: 16 }}>
          Analyzing your {mode}…
        </Text>
        <Text color="textMuted" style={{ marginTop: 6 }}>
          Estimating calories and macros
        </Text>
      </Centered>
    );
  }

  // Result phase
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <Header title="Review" onClose={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {result ? (
          <>
            <Card>
              <Text variant="subtitle">{result.name}</Text>
              <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                {Math.round(result.confidence * 100)}% confidence · tap values you want to tweak after saving
              </Text>
              <View style={styles.totals}>
                <Total label="Calories" value={`${Math.round(result.total.calories)}`} color={theme.colors.calories} />
                <Total label="Protein" value={`${Math.round(result.total.proteinG)}g`} color={theme.colors.protein} />
                <Total label="Carbs" value={`${Math.round(result.total.carbsG)}g`} color={theme.colors.carbs} />
                <Total label="Fat" value={`${Math.round(result.total.fatG)}g`} color={theme.colors.fat} />
              </View>
            </Card>

            {result.items.length > 1 ? (
              <Card style={{ marginTop: 12 }}>
                <Text variant="label" style={{ marginBottom: 8 }}>
                  Detected items
                </Text>
                {result.items.map((it, i) => (
                  <View key={i} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text>{it.name}</Text>
                      <Text variant="caption" color="textMuted">
                        {it.portion}
                      </Text>
                    </View>
                    <Text variant="caption" color="textMuted">
                      {Math.round(it.nutrients.calories)} kcal
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}

            {result.notes ? (
              <Text variant="caption" color="textFaint" style={{ marginTop: 12 }}>
                {result.notes}
              </Text>
            ) : null}

            <Text variant="label" color="textMuted" style={{ marginTop: 20, marginBottom: 8 }}>
              Meal
            </Text>
            <View style={styles.chips}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((s) => (
                <Chip key={s} label={s[0].toUpperCase() + s.slice(1)} selected={slot === s} onPress={() => setSlot(s)} />
              ))}
            </View>
            <View style={{ marginTop: 16 }}>
              <Input label="Servings" keyboardType="decimal-pad" value={servings} onChangeText={setServings} />
            </View>
          </>
        ) : (
          <Card>
            <Text variant="subtitle">Couldn't analyze that</Text>
            <Text color="textMuted" style={{ marginTop: 6 }}>
              Try again with better lighting, or log it manually.
            </Text>
          </Card>
        )}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button label="Retake" variant="secondary" onPress={() => setPhase('capture')} />
          <View style={{ flex: 1 }}>
            <Button label="Add to log" icon="checkmark" onPress={confirm} disabled={!result} />
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
    <View style={styles.headerRow}>
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

function ModePill({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modePill, { backgroundColor: active ? 'white' : 'rgba(255,255,255,0.2)' }]}
    >
      <Ionicons name={icon} size={16} color={active ? '#0F172A' : 'white'} />
      <Text style={{ color: active ? '#0F172A' : 'white', marginLeft: 6, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function Total({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.total}>
      <Text variant="subtitle" style={{ color }}>
        {value}
      </Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.fill, styles.centered, { backgroundColor: theme.colors.background }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', zIndex: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, zIndex: 20 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modeSwitch: { flexDirection: 'row', alignSelf: 'center', gap: 8 },
  modePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  reticleWrap: { alignItems: 'center' },
  reticle: {
    width: 260,
    height: 260,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40, paddingBottom: 10 },
  libraryBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'white' },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  totals: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  total: { alignItems: 'center', flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
