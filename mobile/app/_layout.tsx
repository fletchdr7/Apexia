import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStoreProvider } from '@/store/AppStore';
import { ThemeContext, darkTheme, lightTheme } from '@/theme';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={theme}>
        <AppStoreProvider>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="workout/log" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="nutrition/scan" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="nutrition/log-food" options={{ presentation: 'modal' }} />
            <Stack.Screen name="supplements/analyze" options={{ presentation: 'modal' }} />
          </Stack>
        </AppStoreProvider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
