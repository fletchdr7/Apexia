import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components';
import { config } from '@/lib/config';
import { chatWithCoach } from '@/lib/api';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme';
import type { ChatMessage } from '@/types';
import { uid } from '@/utils/id';

const SUGGESTIONS = [
  'What should I eat for dinner?',
  'Plan a quick workout for today',
  'Which supplements fit my goal?',
  "I'm exhausted — keep it simple",
];

export default function Coach() {
  const theme = useTheme();
  const { profile } = useAppStore();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hey${profile?.displayName ? ` ${profile.displayName}` : ''}! I'm your Apexia coach. Ask me anything about meals, training, supplements, or staying on track on a busy day.`,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    const userMsg: ChatMessage = { id: uid('m_'), role: 'user', content, createdAt: new Date().toISOString() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setThinking(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    try {
      const reply = await chatWithCoach(next, profile);
      setMessages((m) => [...m, reply]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: uid('m_'),
          role: 'assistant',
          content: "I couldn't reach the coaching service just now. Try again in a moment.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setThinking(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.brand }]}>
          <Ionicons name="sparkles" size={18} color={theme.colors.onBrand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">Apexia Coach</Text>
          <Text variant="caption" color="textMuted">
            {config.hasAiBackend ? 'AI-powered' : 'Demo mode · connect AI backend for full power'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
          {thinking ? <Bubble message={{ id: 't', role: 'assistant', content: '…', createdAt: '' }} /> : null}

          {messages.length <= 1 ? (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  style={[styles.suggestion, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                >
                  <Text variant="caption">{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.inputBar, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          <View style={[styles.inputWrap, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask your coach…"
              placeholderTextColor={theme.colors.textFaint}
              style={[styles.input, { color: theme.colors.text }]}
              multiline
              onSubmitEditing={() => send(input)}
            />
          </View>
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || thinking}
            style={[styles.sendBtn, { backgroundColor: input.trim() ? theme.colors.brand : theme.colors.cardMuted }]}
          >
            <Ionicons name="arrow-up" size={22} color={input.trim() ? theme.colors.onBrand : theme.colors.textFaint} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  return (
    <View
      style={[
        styles.bubble,
        {
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          backgroundColor: isUser ? theme.colors.brand : theme.colors.card,
          borderColor: theme.colors.border,
          borderWidth: isUser ? 0 : StyleSheet.hairlineWidth,
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
        },
      ]}
    >
      <Text style={{ color: isUser ? theme.colors.onBrand : theme.colors.text, lineHeight: 21 }}>{message.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bubble: { maxWidth: '86%', padding: 14, borderRadius: 18, marginBottom: 10 },
  suggestions: { marginTop: 12, gap: 8 },
  suggestion: { padding: 14, borderRadius: 14, borderWidth: 1 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  inputWrap: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 4, maxHeight: 120 },
  input: { fontSize: 16, paddingVertical: 8, minHeight: 24 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
