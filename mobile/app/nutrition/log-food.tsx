import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, Input, Text } from '@/components';
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
      source: 'manual',
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
        <Input label="Food name" placeholder="e.g. Chicken salad" value={name} onChangeText={setName} />
        <Text variant="label" color="textMuted" style={{ marginBottom: 8 }}>
          Meal
        </Text>
        <View style={styles.chips}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((s) => (
            <Chip key={s} label={s[0].toUpperCase() + s.slice(1)} selected={slot === s} onPress={() => setSlot(s)} />
          ))}
        </View>
        <View style={{ marginTop: 16 }}>
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
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
