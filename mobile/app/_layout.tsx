import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SyncBridge } from '@/components/SyncBridge';
import { AppStoreProvider } from '@/store/AppStore';
import { AuthProvider } from '@/store/AuthContext';
import { ThemeContext, darkTheme, lightTheme } from '@/theme';

export const unstable_settings = { anchor: '(tabs)' };

/**
 * Shown (in dev and production) when a child route throws. Deliberately uses
 * only bare React Native primitives so it can never fail to render itself —
 * this makes startup errors visible on-device instead of a silent crash.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0B1120', paddingTop: 80, paddingHorizontal: 20 }}>
      <Text style={{ color: '#FB7185', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
        Something went wrong
      </Text>
      <Text style={{ color: '#94A3B8', marginBottom: 16 }}>
        Please screenshot this and send it over so it can be fixed.
      </Text>
      <ScrollView style={{ flex: 1 }}>
        <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '700' }}>{error.name}: {error.message}</Text>
        <Text selectable style={{ color: '#64748B', fontSize: 12, marginTop: 12 }}>
          {error.stack}
        </Text>
      </ScrollView>
      <Pressable
        onPress={retry}
        style={{ backgroundColor: '#10B981', borderRadius: 12, padding: 16, alignItems: 'center', marginVertical: 24 }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={theme}>
        <AuthProvider>
          <AppStoreProvider>
            <SyncBridge />
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
            <Stack.Screen name="workout/log" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="nutrition/scan" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="nutrition/log-food" options={{ presentation: 'modal' }} />
            <Stack.Screen name="supplements/analyze" options={{ presentation: 'modal' }} />
              <Stack.Screen name="equipment/scan" options={{ presentation: 'fullScreenModal' }} />
            </Stack>
          </AppStoreProvider>
        </AuthProvider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
