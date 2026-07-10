import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  footer?: ReactNode;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  contentStyle,
  footer,
}: ScreenProps) {
  const theme = useTheme();
  const padStyle: ViewStyle = padded ? { paddingHorizontal: theme.spacing.lg } : {};

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            { paddingBottom: theme.spacing.xxxl, paddingTop: theme.spacing.md },
            padStyle,
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingTop: theme.spacing.md }, padStyle, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, padStyle, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
