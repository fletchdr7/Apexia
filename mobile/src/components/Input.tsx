import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  suffix?: string;
}

export function Input({ label, hint, suffix, style, ...rest }: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="label" color="textMuted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.card,
            borderColor: focused ? theme.colors.brand : theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <TextInput
          placeholderTextColor={theme.colors.textFaint}
          style={[styles.input, { color: theme.colors.text, fontSize: theme.fontSize.md }, style]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {suffix ? (
          <Text variant="label" color="textMuted" style={styles.suffix}>
            {suffix}
          </Text>
        ) : null}
      </View>
      {hint ? (
        <Text variant="caption" color="textFaint" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 14 },
  suffix: { marginLeft: 8 },
  hint: { marginTop: 6 },
});
