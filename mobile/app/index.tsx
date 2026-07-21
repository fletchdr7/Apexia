import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAppStore } from '@/store/AppStore';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/theme';

export default function Index() {
  const { ready, profile, guestMode } = useAppStore();
  const { session, loading, configured } = useAuth();
  const theme = useTheme();

  if (!ready || loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  // If sync is available and the user hasn't signed in or chosen guest mode, ask them to.
  if (configured && !session && !guestMode) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (profile?.onboardedAt) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(onboarding)" />;
}
