import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Input, Text } from '@/components';
import { estimateFood } from '@/lib/api';
import { searchFoods, type FoodSearchResult } from '@/lib/foodSearch';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { MealSlot } from '@/types';
import { defaultSlotForNow } from '@/utils/meal';

export default function LogFood() {
  const theme = useTheme();
  const router = useRouter();
  const { addFood, dateStamp } = useAppStore();

  const [name, setName] = useState('');
  const [slot, setSlot] = useState<MealSlot>(defaultSlotForNow());
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servings, setServings] = useState('1');

  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [basisNote, setBasisNote] = useState<string | null>(null);
  const skipSearch = useRef(false);

  // Live food lookup (debounced) as the user types the name.
  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    const q = name.trim();
    if (q.length < 2) {
      setResults([]);
      setNoResults(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    setNoResults(false);
    const timer = setTimeout(async () => {
      try {
        const r = await searchFoods(q, ctrl.signal);
        setResults(r);
        setNoResults(r.length === 0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [name]);

  const select = (r: FoodSearchResult) => {
    skipSearch.current = true;
    setName(r.name);
    setCalories(String(Math.round(r.nutrients.calories)));
    setProtein(String(Math.round(r.nutrients.proteinG)));
    setCarbs(String(Math.round(r.nutrients.carbsG)));
    setFat(String(Math.round(r.nutrients.fatG)));
    setBasisNote(r.basis === 'serving' ? `Per serving (${r.servingLabel})` : 'Per 100 g — adjust servings');
    setResults([]);
    setNoResults(false);
  };

  const estimate = async () => {
    const q = name.trim();
    if (q.length < 2) return;
    setEstimating(true);
    try {
      const r = await estimateFood(q);
      select(r);
      setBasisNote(`AI estimate (${r.servingLabel}) — adjust as needed`);
    } catch {
      // ignore
    } finally {
      setEstimating(false);
    }
  };

  const canSave = name.trim().length > 0 && Number(calories) > 0;

  const save = () => {
    addFood({
      name: name.trim(),
      slot,
      loggedAt: dateStamp(),
      servings: Number(servings) || 1,
      nutrients: {
        calories: Number(calories) || 0,
        proteinG: Number(protein) || 0,
        carbsG: Number(carbs) || 0,
        fatG: Number(fat) || 0,
      },
      source: 'search',
    });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="heading">Log food</Text>
        <Button label="Close" variant="ghost" onPress={() => router.back()} fullWidth={false} size="sm" />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Input
          label="Food name"
          placeholder="Type to search, e.g. Snickers bar"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setBasisNote(null);
          }}
          hint="We'll auto-fill the nutrition — you can edit it after."
        />

        {searching ? (
          <View style={styles.searchRow}>
            <ActivityIndicator size="small" color={theme.colors.brand} />
            <Text variant="caption" color="textMuted" style={{ marginLeft: 8 }}>
              Searching foods…
            </Text>
          </View>
        ) : null}

        {results.length > 0 ? (
          <View style={{ marginBottom: 8 }}>
            {results.map((r) => (
              <Card key={r.id} onPress={() => select(r)} style={{ marginBottom: 8 }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {Math.round(r.nutrients.calories)} kcal · P{Math.round(r.nutrients.proteinG)} · C
                      {Math.round(r.nutrients.carbsG)} · F{Math.round(r.nutrients.fatG)} ·{' '}
                      {r.basis === 'serving' ? r.servingLabel : 'per 100 g'}
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={22} color={theme.colors.brand} />
                </View>
              </Card>
            ))}
            <Text variant="caption" color="textFaint" style={{ marginTop: 2 }}>
              Nutrition data from Open Food Facts
            </Text>
          </View>
        ) : null}

        {noResults && !searching ? (
          <Card onPress={estimate} style={{ marginBottom: 8 }}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="label">Estimate “{name.trim()}” with AI</Text>
                <Text variant="caption" color="textMuted">
                  No database match — get an AI nutrition estimate
                </Text>
              </View>
              {estimating ? (
                <ActivityIndicator color={theme.colors.brand} />
              ) : (
                <Ionicons name="sparkles" size={20} color={theme.colors.brand} />
              )}
            </View>
          </Card>
        ) : null}

        <Text variant="label" color="textMuted" style={{ marginBottom: 8, marginTop: 4 }}>
          Meal
        </Text>
        <View style={styles.chips}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((s) => (
            <Chip key={s} label={s[0].toUpperCase() + s.slice(1)} selected={slot === s} onPress={() => setSlot(s)} />
          ))}
        </View>

        <View style={{ marginTop: 16 }}>
          {basisNote ? (
            <Text variant="caption" color="brand" style={{ marginBottom: 8 }}>
              {basisNote}
            </Text>
          ) : null}
          <Input label="Calories" keyboardType="number-pad" value={calories} onChangeText={setCalories} suffix="kcal" />
          <View style={styles.row}>
            <View style={styles.col}>
              <Input label="Protein" keyboardType="decimal-pad" value={protein} onChangeText={setProtein} suffix="g" />
            </View>
            <View style={styles.col}>
              <Input label="Carbs" keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} suffix="g" />
            </View>
            <View style={styles.col}>
              <Input label="Fat" keyboardType="decimal-pad" value={fat} onChangeText={setFat} suffix="g" />
            </View>
          </View>
          <Input label="Servings" keyboardType="decimal-pad" value={servings} onChangeText={setServings} />
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <Button label="Add to log" icon="checkmark" onPress={save} disabled={!canSave} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
