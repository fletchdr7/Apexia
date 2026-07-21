import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input, Text } from '@/components';
import { useAppStore } from '@/store/AppStore';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/theme';

type Mode = 'signin' | 'signup';

export default function SignIn() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const { setGuestMode } = useAppStore();

  const [mode, setMode] = useState<Mode>('signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canSubmit = email.trim().length > 3 && password.length >= 6;

  const submit = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const res = await signUp(email, password, displayName.trim() || undefined);
        if (res.error) {
          setError(res.error);
          return;
        }
        if (res.needsConfirmation) {
          setInfo('Check your email to confirm your account, then sign in.');
          setMode('signin');
          return;
        }
      } else {
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error);
          return;
        }
      }
      // Success: leave guest mode and let the root route to onboarding/tabs.
      setGuestMode(false);
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };

  const continueAsGuest = () => {
    setGuestMode(true);
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.logo, { backgroundColor: theme.colors.brand }]}>
            <Ionicons name="triangle" size={32} color={theme.colors.onBrand} />
          </View>
          <Text variant="title" style={{ marginTop: 20 }}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text color="textMuted" style={{ marginTop: 6, lineHeight: 20 }}>
            {mode === 'signup'
              ? 'Sign up to back up your data and sync across devices.'
              : 'Sign in to access your synced data.'}
          </Text>

          <View style={{ marginTop: 24 }}>
            {mode === 'signup' ? (
              <Input label="Name" placeholder="Your name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
            ) : null}
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {error ? (
            <Card muted style={{ marginBottom: 12, borderColor: theme.colors.danger }}>
              <Text style={{ color: theme.colors.danger }}>{error}</Text>
            </Card>
          ) : null}
          {info ? (
            <Card muted style={{ marginBottom: 12 }}>
              <Text style={{ color: theme.colors.brand }}>{info}</Text>
            </Card>
          ) : null}

          <Button
            label={mode === 'signup' ? 'Create account' : 'Sign in'}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
            iconRight="arrow-forward"
          />

          <Pressable
            onPress={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError(null);
              setInfo(null);
            }}
            style={styles.toggle}
            hitSlop={8}
          >
            <Text center color="textMuted">
              {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={{ color: theme.colors.brand }}>{mode === 'signup' ? 'Sign in' : 'Create one'}</Text>
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
            <Text variant="caption" color="textFaint" style={{ marginHorizontal: 10 }}>
              or
            </Text>
            <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
          </View>

          <Button label="Continue without an account" variant="ghost" onPress={continueAsGuest} />
          <Text variant="caption" color="textFaint" center style={{ marginTop: 10 }}>
            Your data stays only on this device until you sign in.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 40 },
  logo: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  toggle: { marginTop: 20, paddingVertical: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
