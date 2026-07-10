import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, DateBar, EmptyState, MacroBar, Screen, SectionHeader, Text } from '@/components';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { FoodEntry, MealSlot } from '@/types';
import { timeLabel } from '@/utils/date';

const SLOTS: Array<{ slot: MealSlot; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { slot: 'breakfast', label: 'Breakfast', icon: 'sunny' },
  { slot: 'lunch', label: 'Lunch', icon: 'partly-sunny' },
  { slot: 'dinner', label: 'Dinner', icon: 'moon' },
  { slot: 'snack', label: 'Snacks', icon: 'nutrition' },
];

const SOURCE_ICON: Record<FoodEntry['source'], keyof typeof Ionicons.glyphMap> = {
  manual: 'create',
  label_scan: 'barcode',
  plate_scan: 'camera',
  search: 'search',
  coach: 'sparkles',
};

export default function Nutrition() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, selectedDate, setSelectedDate, foodsForDate, nutritionForDate, removeFood } = useAppStore();

  const foods = foodsForDate(selectedDate);
  const nutrition = nutritionForDate(selectedDate);
  const targets = profile?.targets;

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title">Nutrition</Text>
        <Button label="Scan" icon="camera" onPress={() => router.push('/nutrition/scan')} fullWidth={false} size="sm" />
      </View>

      <View style={{ marginBottom: 8 }}>
        <DateBar date={selectedDate} onChange={setSelectedDate} />
      </View>

      <Card style={{ marginTop: 8 }}>
        <View style={styles.summaryRow}>
          <View>
            <Text variant="display" color="brand">
              {Math.round(nutrition.calories)}
            </Text>
            <Text variant="caption" color="textMuted">
              of {targets?.calories ?? '—'} kcal
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.colors.brandSoft }]}>
            <Text variant="caption" style={{ color: theme.colors.brand }}>
              {targets ? `${Math.max(0, Math.round(targets.calories - nutrition.calories))} left` : ''}
            </Text>
          </View>
        </View>
        <View style={{ marginTop: 16 }}>
          <MacroBar label="Protein" value={nutrition.proteinG} target={targets?.proteinG ?? 0} color={theme.colors.protein} />
          <MacroBar label="Carbs" value={nutrition.carbsG} target={targets?.carbsG ?? 0} color={theme.colors.carbs} />
          <MacroBar label="Fat" value={nutrition.fatG} target={targets?.fatG ?? 0} color={theme.colors.fat} />
        </View>
      </Card>

      <View style={styles.actions}>
        <Pressable style={[styles.action, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => router.push('/nutrition/scan')}>
          <Ionicons name="camera" size={22} color={theme.colors.calories} />
          <Text variant="caption" style={{ marginTop: 6 }}>
            Scan plate
          </Text>
        </Pressable>
        <Pressable style={[styles.action, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => router.push('/nutrition/scan')}>
          <Ionicons name="barcode" size={22} color={theme.colors.protein} />
          <Text variant="caption" style={{ marginTop: 6 }}>
            Scan label
          </Text>
        </Pressable>
        <Pressable style={[styles.action, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => router.push('/nutrition/log-food')}>
          <Ionicons name="create" size={22} color={theme.colors.fat} />
          <Text variant="caption" style={{ marginTop: 6 }}>
            Manual
          </Text>
        </Pressable>
      </View>

      {foods.length === 0 ? (
        <View style={{ marginTop: 8 }}>
          <EmptyState
            icon="restaurant"
            title="Nothing logged for this day"
            message="Snap a photo of your meal or a nutrition label and Apexia estimates the macros."
            actionLabel="Log a meal"
            onAction={() => router.push('/nutrition/scan')}
          />
        </View>
      ) : (
        SLOTS.map(({ slot, label, icon }) => {
          const items = foods.filter((f) => f.slot === slot);
          if (items.length === 0) return null;
          const slotCals = items.reduce((s, f) => s + f.nutrients.calories * f.servings, 0);
          return (
            <View key={slot}>
              <SectionHeader title={`${label} · ${Math.round(slotCals)} kcal`} />
              {items.map((f) => (
                <Card key={f.id} style={{ marginBottom: 10 }}>
                  <View style={styles.row}>
                    <View style={[styles.icon, { backgroundColor: theme.colors.cardMuted }]}>
                      <Ionicons name={SOURCE_ICON[f.source]} size={18} color={theme.colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="label">{f.name}</Text>
                      <Text variant="caption" color="textMuted">
                        {Math.round(f.nutrients.calories * f.servings)} kcal · P{Math.round(f.nutrients.proteinG * f.servings)} · C
                        {Math.round(f.nutrients.carbsG * f.servings)} · F{Math.round(f.nutrients.fatG * f.servings)}
                      </Text>
                      <Text variant="caption" color="textFaint" style={{ marginTop: 2 }}>
                        {timeLabel(f.loggedAt)}
                        {f.confidence ? ` · ${Math.round(f.confidence * 100)}% AI confidence` : ''}
                      </Text>
                    </View>
                    <Pressable hitSlop={10} onPress={() => removeFood(f.id)}>
                      <Ionicons name="close-circle" size={20} color={theme.colors.textFaint} />
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  action: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});
