import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';

export default function Index() {
  const { ready, profile } = useAppStore();
  const theme = useTheme();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  if (profile?.onboardedAt) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(onboarding)" />;
}
