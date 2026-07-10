import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input, Text } from '@/components';
import { EQUIPMENT_CATALOG, EQUIPMENT_CATEGORIES } from '@/constants/equipment';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { Equipment, EquipmentCategory } from '@/types';

const CATEGORY_ORDER: EquipmentCategory[] = [
  'free_weights',
  'machine',
  'cable',
  'cardio',
  'bodyweight',
  'accessory',
  'other',
];

export default function EquipmentLibrary() {
  const theme = useTheme();
  const router = useRouter();
  const { customEquipment, selectedEquipmentIds, toggleEquipment, removeEquipment } = useAppStore();
  const [query, setQuery] = useState('');

  const all = useMemo<Equipment[]>(() => [...customEquipment, ...EQUIPMENT_CATALOG], [customEquipment]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.primaryMuscles.some((m) => m.toLowerCase().includes(q)),
    );
  }, [all, query]);

  const grouped = useMemo(() => {
    const map = new Map<EquipmentCategory, Equipment[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const e of filtered) map.get(e.category)?.push(e);
    return CATEGORY_ORDER.map((cat) => ({ cat, items: map.get(cat) ?? [] })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const selectedCount = selectedEquipmentIds.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>
          Equipment
        </Text>
        <Button label="Scan" icon="camera" onPress={() => router.push('/equipment/scan')} fullWidth={false} size="sm" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Card muted>
          <View style={styles.row}>
            <Ionicons name="information-circle" size={18} color={theme.colors.brand} />
            <Text variant="label" style={{ marginLeft: 8, flex: 1 }}>
              Select what you have access to
            </Text>
            <Text variant="caption" color="textMuted">
              {selectedCount} selected
            </Text>
          </View>
          <Text variant="caption" color="textMuted" style={{ marginTop: 6 }}>
            Can&apos;t find a machine? Tap Scan and the AI will identify it and add it here.
          </Text>
        </Card>

        <View style={{ marginTop: 16 }}>
          <Input placeholder="Search equipment or muscle…" value={query} onChangeText={setQuery} autoCapitalize="none" />
        </View>

        {grouped.map(({ cat, items }) => (
          <View key={cat} style={{ marginTop: 8 }}>
            <View style={styles.catHeader}>
              <Ionicons name={EQUIPMENT_CATEGORIES[cat].icon} size={16} color={theme.colors.textMuted} />
              <Text variant="label" color="textMuted" style={{ marginLeft: 8 }}>
                {EQUIPMENT_CATEGORIES[cat].label}
              </Text>
            </View>
            {items.map((e) => {
              const selected = selectedEquipmentIds.includes(e.id);
              return (
                <Card key={e.id} onPress={() => toggleEquipment(e.id)} style={{ marginBottom: 8 }}>
                  <View style={styles.row}>
                    <View style={[styles.icon, { backgroundColor: selected ? theme.colors.brandSoft : theme.colors.cardMuted }]}>
                      <Ionicons
                        name={EQUIPMENT_CATEGORIES[e.category].icon}
                        size={20}
                        color={selected ? theme.colors.brand : theme.colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text variant="label">{e.name}</Text>
                        {e.source !== 'catalog' ? (
                          <View style={[styles.tag, { backgroundColor: theme.colors.brandSoft }]}>
                            <Text variant="caption" style={{ color: theme.colors.brand }}>
                              Scanned
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {e.primaryMuscles.length ? (
                        <Text variant="caption" color="textMuted">
                          {e.primaryMuscles.join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    {e.source !== 'catalog' ? (
                      <Pressable hitSlop={10} onPress={() => removeEquipment(e.id)} style={{ marginRight: 10 }}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.textFaint} />
                      </Pressable>
                    ) : null}
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={selected ? theme.colors.brand : theme.colors.textFaint}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        ))}

        {grouped.length === 0 ? (
          <Text color="textMuted" center style={{ marginTop: 24 }}>
            No equipment matches “{query}”. Try scanning it instead.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  catHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
});
