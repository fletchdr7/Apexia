import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components';
import { EQUIPMENT_CATEGORIES } from '@/constants/equipment';
import { analyzeEquipmentPhoto } from '@/lib/api';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { EquipmentScanResult, WorkoutLocation } from '@/types';

type Phase = 'capture' | 'analyzing' | 'result';

export default function ScanEquipment() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ location?: string }>();
  const location: WorkoutLocation = params.location === 'home' ? 'home' : 'gym';
  const { addEquipment } = useAppStore();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<Phase>('capture');
  const [result, setResult] = useState<EquipmentScanResult | null>(null);

  const run = async (base64: string) => {
    setPhase('analyzing');
    try {
      setResult(await analyzeEquipmentPhoto(base64));
    } catch {
      setResult(null);
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

  const addToLibrary = () => {
    if (!result) return;
    addEquipment({
      name: result.name,
      category: result.category,
      primaryMuscles: result.primaryMuscles,
      description: result.description,
      exampleExercises: result.exampleExercises,
      howToUse: result.howToUse,
      source: 'scan',
    }, location);
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
          <Header title="Scan equipment" onClose={() => router.back()} />
          <View style={styles.center}>
            <Ionicons name="barbell" size={48} color={theme.colors.brand} />
            <Text variant="subtitle" center style={{ marginTop: 16 }}>
              Camera access needed
            </Text>
            <Text color="textMuted" center style={{ marginTop: 8, maxWidth: 280 }}>
              Point your camera at a machine or piece of equipment and the AI will identify it.
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
          <Header title="Scan equipment" onClose={() => router.back()} light />
          <View style={styles.center}>
            <View style={styles.reticle} />
            <Text style={{ color: 'white', marginTop: 12 }}>Frame the whole machine</Text>
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
          Identifying equipment…
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <Header title="Identified" onClose={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {result ? (
          <>
            <Card>
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: theme.colors.brandSoft }]}>
                    <Ionicons name={EQUIPMENT_CATEGORIES[result.category].icon} size={20} color={theme.colors.brand} />
                  </View>
                  <View>
                    <Text variant="subtitle">{result.name}</Text>
                    <Text variant="caption" color="textMuted">
                      {EQUIPMENT_CATEGORIES[result.category].label}
                    </Text>
                  </View>
                </View>
                <View style={[styles.tag, { backgroundColor: theme.colors.brandSoft }]}>
                  <Text variant="caption" style={{ color: theme.colors.brand }}>
                    {Math.round(result.confidence * 100)}%
                  </Text>
                </View>
              </View>
              {result.description ? (
                <Text color="textMuted" style={{ marginTop: 12, lineHeight: 20 }}>
                  {result.description}
                </Text>
              ) : null}
            </Card>

            {result.primaryMuscles.length ? (
              <Card style={{ marginTop: 12 }}>
                <Text variant="label" style={{ marginBottom: 8 }}>
                  Primary muscles
                </Text>
                <View style={styles.chips}>
                  {result.primaryMuscles.map((m, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: theme.colors.cardMuted }]}>
                      <Text variant="caption">{m}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            {result.exampleExercises.length ? (
              <Card style={{ marginTop: 12 }}>
                <Text variant="label" style={{ marginBottom: 8 }}>
                  Example exercises
                </Text>
                {result.exampleExercises.map((ex, i) => (
                  <View key={i} style={{ flexDirection: 'row', marginTop: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.brand} style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={{ flex: 1 }} color="textMuted">
                      {ex}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}

            {result.howToUse ? (
              <Card style={{ marginTop: 12 }}>
                <Text variant="label">How to use</Text>
                <Text color="textMuted" style={{ marginTop: 4, lineHeight: 20 }}>
                  {result.howToUse}
                </Text>
              </Card>
            ) : null}

            {result.notes ? (
              <Text variant="caption" color="textFaint" style={{ marginTop: 12 }}>
                {result.notes}
              </Text>
            ) : null}
          </>
        ) : (
          <Card>
            <Text variant="subtitle">Couldn&apos;t identify that</Text>
            <Text color="textMuted" style={{ marginTop: 6 }}>
              Try again with the whole machine in frame and good lighting.
            </Text>
          </Card>
        )}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button label="Rescan" variant="secondary" onPress={() => setPhase('capture')} />
          <View style={{ flex: 1 }}>
            <Button label="Add to my equipment" icon="add" onPress={addToLibrary} disabled={!result} />
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
      <Pressable onPress={onClose} hitSlop={10}>
        <Ionicons name="close" size={28} color={color} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  reticle: { width: 280, height: 280, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40, paddingBottom: 10 },
  libraryBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'white' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
