import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BROWSE_GROUPS, browseLibrary, type ExerciseMedia } from '@/lib/exerciseMedia';
import { useTheme } from '@/theme';
import { Chip } from './Chip';
import { ExerciseDemo } from './ExerciseDemo';
import { Input } from './Input';
import { Text } from './Text';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (media: ExerciseMedia) => void;
  available?: Set<string>;
  initialGroup?: string;
}

export function ExercisePicker({ visible, onClose, onSelect, available, initialGroup = 'all' }: ExercisePickerProps) {
  const theme = useTheme();
  const [group, setGroup] = useState(initialGroup);
  const [query, setQuery] = useState('');
  const [myGearOnly, setMyGearOnly] = useState(Boolean(available));

  const results = useMemo(
    () => browseLibrary({ group, query, available: myGearOnly ? available : undefined }),
    [group, query, myGearOnly, available],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text variant="heading" style={{ flex: 1 }}>
            Choose exercise
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { backgroundColor: theme.colors.cardMuted }]}>
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <Input placeholder="Search exercises…" value={query} onChangeText={setQuery} autoCapitalize="none" />
        </View>

        <View style={styles.chipsWrap}>
          <FlatList
            horizontal
            data={BROWSE_GROUPS}
            keyExtractor={(g) => g.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item }) => (
              <Chip label={item.label} selected={group === item.id} onPress={() => setGroup(item.id)} />
            )}
          />
        </View>

        {available ? (
          <Pressable onPress={() => setMyGearOnly((v) => !v)} style={styles.gearToggle} hitSlop={6}>
            <Ionicons
              name={myGearOnly ? 'checkbox' : 'square-outline'}
              size={18}
              color={myGearOnly ? theme.colors.brand : theme.colors.textFaint}
            />
            <Text variant="caption" color="textMuted" style={{ marginLeft: 8 }}>
              Only exercises for my equipment
            </Text>
          </Pressable>
        ) : null}

        <FlatList
          data={results}
          keyExtractor={(e) => e.name}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [styles.row, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 }]}
            >
              <ExerciseDemo name={item.name} muscles={item.primaryMuscles} size={48} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="label" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="caption" color="textMuted" numberOfLines={1} style={{ textTransform: 'capitalize' }}>
                  {item.primaryMuscles.join(', ')}
                  {item.equipment ? ` · ${item.equipment}` : ''}
                </Text>
              </View>
              <Ionicons name="add-circle" size={24} color={theme.colors.brand} />
            </Pressable>
          )}
          ListEmptyComponent={
            <Text color="textFaint" center style={{ marginTop: 32 }}>
              No exercises match. Try a different muscle group or turn off the equipment filter.
            </Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  chipsWrap: { marginTop: 4, marginBottom: 6 },
  gearToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
});
