import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { findExerciseMedia, type ExerciseMedia } from '@/lib/exerciseMedia';
import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

interface ExerciseDemoProps {
  name: string;
  size?: number;
  muscles?: string[];
}

export function ExerciseDemo({ name, size = 52, muscles }: ExerciseDemoProps) {
  const theme = useTheme();
  const media = useMemo(() => findExerciseMedia(name), [name]);
  const [open, setOpen] = useState(false);

  const primaryList = media?.primaryMuscles?.length ? media.primaryMuscles : muscles ?? [];
  const primary = primaryList[0];

  if (!media) {
    return (
      <View style={[styles.thumb, { width: size, height: size, backgroundColor: theme.colors.cardMuted, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="barbell-outline" size={size * 0.42} color={theme.colors.textFaint} />
      </View>
    );
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.thumb, { width: size, height: size, backgroundColor: theme.colors.cardMuted }]}>
        <Image source={media.images[0]} style={{ width: size, height: size }} contentFit="cover" transition={150} />
        <View style={styles.playBadge}>
          <Ionicons name="play" size={9} color="#fff" />
        </View>
        {primary ? (
          <View style={styles.muscleTag}>
            <Text style={styles.muscleTagText} numberOfLines={1}>
              {primary}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle="pageSheet">
        <DemoModal media={media} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function DemoModal({ media, onClose }: { media: ExerciseMedia; onClose: () => void }) {
  const theme = useTheme();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (media.images.length < 2) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % media.images.length), 850);
    return () => clearInterval(t);
  }, [media]);

  return (
    <SafeAreaView style={[styles.modal, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.modalHeader}>
        <Text variant="heading" style={{ flex: 1 }} numberOfLines={1}>
          {media.name}
        </Text>
        <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { backgroundColor: theme.colors.cardMuted }]}>
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.stage, { backgroundColor: theme.colors.cardMuted }]}>
          <Image source={media.images[frame]} style={styles.stageImg} contentFit="cover" transition={250} />
          <View style={styles.loopBadge}>
            <Ionicons name="sync" size={12} color="#fff" />
            <Text style={styles.loopText}>{frame === 0 ? 'Start' : 'Finish'} · looping</Text>
          </View>
        </View>

        <Button
          label="Watch video demos"
          icon="logo-youtube"
          variant="secondary"
          onPress={() =>
            Linking.openURL(
              `https://www.youtube.com/results?search_query=${encodeURIComponent(`${media.name} exercise proper form`)}`,
            )
          }
          style={{ marginTop: 12 }}
        />

        <View style={styles.chips}>
          {media.primaryMuscles.map((m) => (
            <View key={m} style={[styles.chip, { backgroundColor: theme.colors.brand }]}>
              <Text variant="caption" style={{ color: theme.colors.onBrand, textTransform: 'capitalize' }}>
                {m}
              </Text>
            </View>
          ))}
          {media.secondaryMuscles.map((m) => (
            <View key={m} style={[styles.chip, { backgroundColor: theme.colors.cardMuted }]}>
              <Text variant="caption" color="textMuted" style={{ textTransform: 'capitalize' }}>
                {m}
              </Text>
            </View>
          ))}
        </View>

        {(media.equipment || media.level) ? (
          <Text variant="caption" color="textFaint" style={{ marginTop: 10, textTransform: 'capitalize' }}>
            {[media.equipment, media.level].filter(Boolean).join(' · ')}
          </Text>
        ) : null}

        {media.instructions.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <Text variant="subtitle" style={{ marginBottom: 10 }}>
              How to do it
            </Text>
            {media.instructions.map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepNum, { backgroundColor: theme.colors.brandSoft }]}>
                  <Text variant="caption" style={{ color: theme.colors.brand, fontWeight: '700' }}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={{ flex: 1, lineHeight: 21 }} color="textMuted">
                  {step}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end' },
  playBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleTag: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 4, paddingVertical: 2 },
  muscleTagText: { color: '#fff', fontSize: 8, fontWeight: '600', textTransform: 'capitalize', textAlign: 'center' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  stage: { width: '100%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden' },
  stageImg: { width: '100%', height: '100%' },
  loopBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  loopText: { color: '#fff', fontSize: 12, marginLeft: 6, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  step: { flexDirection: 'row', marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});
