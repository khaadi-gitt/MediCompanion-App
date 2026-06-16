import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MarkdownText } from '../components/MarkdownText';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  confidenceLabel?: 'low' | 'medium' | 'high' | 'very_low';
  sources?: string[];
  // v2 RAG analytics
  ragUsed?: boolean;
  faithfulnessScore?: number;  // 0–1
  halluScore?: number;         // 0–1 (higher = more hallucination)
  llmUsed?: string;            // 'ollama' | 'openai'
  totalLatencyMs?: number;     // sum of all pipeline stages
};

const TOPIC_KEYWORDS = {
  migraine: [
    'migraine',
    'migrain',
    'headache',
    'aura',
    'photophobia',
    'light sensitivity',
    'throbbing',
  ],
  gastro: [
    'gastro',
    'gastric',
    'gastritis',
    'gastroenteritis',
    'stomach',
    'abdomen',
    'abdominal',
    'acidity',
    'reflux',
    'gerd',
    'heartburn',
    'constipation',
    'diarrhea',
    'vomit',
    'nausea',
  ],
} as const;

function normalizeTopicTypos(text: string): string {
  let out = String(text || '');
  out = out.replace(/\bmigrain\b/gi, 'migraine');
  return out;
}

const SENDING_STAGES = [
  'Thinking…',
  'Searching medical documents…',
  'Generating response…',
];

function TypingIndicator({ stage }: { stage: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeBounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 280, useNativeDriver: true }),
          Animated.delay(Math.max(0, 560 - delay)),
        ])
      );

    const a1 = makeBounce(dot1, 0);
    const a2 = makeBounce(dot2, 140);
    const a3 = makeBounce(dot3, 280);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={typingStyles.wrapper}>
      <View style={typingStyles.dotsRow}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[typingStyles.dot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
      <Text style={typingStyles.stageText}>{stage}</Text>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#25AFC0',
  },
  stageText: {
    fontSize: 13,
    color: '#6D7B8E',
    fontStyle: 'italic',
  },
});

export function ChatScreen({
  userId,
  sessionId,
  sessionMessages,
  initialText,
  onAppendMessage,
  onGoHome,
}: {
  userId: string | null;
  sessionId: string | null;
  sessionMessages: ChatMsg[];
  initialText: string;
  onAppendMessage: (msg: ChatMsg) => void;
  onGoHome: () => void;
}) {
  const backendApiBase = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 900;
  const contentWidth = Math.min(isDesktop ? 760 : 560, width - 20);
  const bottomSafe = Math.max(insets.bottom, Platform.OS === 'android' ? 2 : 8);
  const scrollRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState(initialText);
  const [isSending, setIsSending] = useState(false);
  const [sendingStage, setSendingStage] = useState(SENDING_STAGES[0]);
  const [messages, setMessages] = useState<ChatMsg[]>(sessionMessages);

  useEffect(() => {
    setMessages(sessionMessages);
  }, [sessionMessages]);

  useEffect(() => {
    if (!sessionId || !backendApiBase) return;

    const fetchHistory = async () => {
      try {
        const resp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/api/chat/messages?session_id=${sessionId}`);
        const data = await resp.json();
        if (resp.ok && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } catch (e) {
        console.error('Failed to fetch session history:', e);
      }
    };

    fetchHistory();
  }, [sessionId, backendApiBase]);

  const sendSpecificMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isSending) return;

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text };
    const nextHistory = [...messages, userMsg];

    setMessages((prev) => [...prev, userMsg]);
    onAppendMessage(userMsg);
    setInputText('');

    try {
      setIsSending(true);
      const normalizedText = normalizeTopicTypos(text);
      const normalizedHistory = nextHistory
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.role === 'user' ? normalizeTopicTypos(m.text) : m.text }));

      if (!backendApiBase) {
        throw new Error('EXPO_PUBLIC_API_BASE_URL is missing in .env');
      }

      const resp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: normalizedText,
          history: normalizedHistory,
          user_id: userId,
          session_id: sessionId,
        }),
      });
      const data: any = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'Backend chat request failed.');
      }

      const reply = typeof data?.reply === 'string' && data.reply.trim() ? data.reply.trim() : 'Sorry, the server returned an invalid response.';
      const incomingLabel = String(data?.confidence_label || '').toLowerCase();
      const confidenceLabel: ChatMsg['confidenceLabel'] =
        incomingLabel === 'high'     ? 'high'     :
        incomingLabel === 'medium'   ? 'medium'   :
        incomingLabel === 'low'      ? 'low'      :
        incomingLabel === 'very_low' ? 'very_low' : undefined;
      const sources: string[] = Array.isArray(data?.sources)
        ? data.sources.filter((s: any) => typeof s === 'string' && s.trim())
        : [];

      // v2 analytics fields
      const ragUsed = Boolean(data?.rag_used);
      const faithfulnessScore = ragUsed && typeof data?.faithfulness_score === 'number'
        ? data.faithfulness_score : undefined;
      const halluScore = ragUsed && typeof data?.hallucination_score === 'number'
        ? data.hallucination_score : undefined;
      const llmUsed = typeof data?.llm_used === 'string' ? data.llm_used : undefined;
      const latencyObj = data?.latency_ms && typeof data.latency_ms === 'object' ? data.latency_ms : null;
      const totalLatencyMs = latencyObj
        ? Object.values(latencyObj as Record<string, number>).reduce((s, v) => s + (Number(v) || 0), 0)
        : undefined;

      const assistantMsg: ChatMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: reply,
        confidenceLabel,
        sources: sources.length > 0 ? sources : undefined,
        ragUsed,
        faithfulnessScore,
        halluScore,
        llmUsed,
        totalLatencyMs,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      onAppendMessage(assistantMsg);
    } catch (e: any) {
      const detail = String(e?.message || '').trim();
      const errMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant' as const,
        text: detail
          ? `Connection error: ${detail}`
          : 'Connection error: check Supabase Function deployment and project keys in .env.',
      };
      setMessages((prev) => [...prev, errMsg]);
      onAppendMessage(errMsg);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    setInputText(initialText.trim());
  }, [initialText]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isSending]);

  // Cycle through stage labels while a response is being fetched
  useEffect(() => {
    if (!isSending) {
      setSendingStage(SENDING_STAGES[0]);
      return;
    }
    let idx = 0;
    const timers = SENDING_STAGES.slice(1).map((stage, i) =>
      setTimeout(() => setSendingStage(stage), (i + 1) * 2000)
    );
    return () => timers.forEach(clearTimeout);
  }, [isSending]);

  const sendMessage = async () => {
    await sendSpecificMessage(inputText);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      enabled
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.chatRoot, { paddingBottom: 0 }]}>
      <View style={[styles.chatContent, { width: contentWidth }]}>
        <View style={styles.chatTopRow}>
          <Pressable style={styles.chatBackBtn} onPress={onGoHome}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#248EA0" />
          </Pressable>
          <Text style={styles.chatTitle}>New Chat</Text>
          <View style={styles.chatTopRight} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m) => (
            <View
              key={m.id}
              style={[styles.chatBubble, m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant]}
            >
              {m.role === 'user'
                ? <Text style={styles.chatTextUser}>{m.text}</Text>
                : <MarkdownText text={m.text} style={styles.chatTextAssistant} />}
              {m.role === 'assistant' && m.confidenceLabel ? (
                <Text style={[
                  styles.chatConfidenceText,
                  m.confidenceLabel === 'high'
                    ? { color: '#065F46' }
                    : m.confidenceLabel === 'medium'
                      ? { color: '#92400E' }
                      : { color: '#991B1B' },
                ]}>
                  Confidence: {m.confidenceLabel.replace('_', ' ')}
                </Text>
              ) : null}
              {m.role === 'assistant' && m.sources && m.sources.length > 0 ? (
                <View style={styles.sourceChipsRow}>
                  <Text style={styles.sourceChipsLabel}>Sources:</Text>
                  {m.sources.map((src, idx) => (
                    <View key={idx} style={styles.sourceChip}>
                      <Text style={styles.sourceChipText} numberOfLines={1}>{src}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {m.role === 'assistant' && m.ragUsed ? (
                <View style={styles.metaRow}>
                  {typeof m.faithfulnessScore === 'number' ? (
                    <View style={[
                      styles.metaBadge,
                      m.faithfulnessScore > 0.6
                        ? styles.metaBadgeGreen
                        : m.faithfulnessScore > 0.35
                          ? styles.metaBadgeYellow
                          : styles.metaBadgeRed,
                    ]}>
                      <Text style={[
                        styles.metaBadgeText,
                        m.faithfulnessScore > 0.6
                          ? styles.metaBadgeTextGreen
                          : m.faithfulnessScore > 0.35
                            ? styles.metaBadgeTextYellow
                            : styles.metaBadgeTextRed,
                      ]}>
                        Faithful {Math.round(m.faithfulnessScore * 100)}%
                      </Text>
                    </View>
                  ) : null}
                  {typeof m.halluScore === 'number' && m.halluScore > 0.4 ? (
                    <View style={[styles.metaBadge, styles.metaBadgeRed]}>
                      <Text style={[styles.metaBadgeText, styles.metaBadgeTextRed]}>⚠ Unverified</Text>
                    </View>
                  ) : null}
                  {m.llmUsed ? (
                    <View style={[styles.metaBadge, styles.metaBadgeGray]}>
                      <Text style={[styles.metaBadgeText, styles.metaBadgeTextGray]}>
                        {m.llmUsed === 'ollama' ? 'Ollama' : 'OpenAI'}
                      </Text>
                    </View>
                  ) : null}
                  {typeof m.totalLatencyMs === 'number' ? (
                    <Text style={styles.metaLatency}>{(m.totalLatencyMs / 1000).toFixed(1)}s</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
          {isSending ? (
            <View style={[styles.chatBubble, styles.chatBubbleAssistant]}>
              <TypingIndicator stage={sendingStage} />
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.chatComposer, { marginBottom: bottomSafe }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your medical question..."
            placeholderTextColor="#8A93A4"
            style={styles.chatInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <Pressable style={[styles.chatSendBtn, isSending && styles.chatSendBtnDisabled]} onPress={sendMessage}>
            <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chatRoot: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 6 : 10,
  },
  chatContent: {
    flex: 1,
    paddingBottom: 0,
  },
  chatScroll: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chatBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CCE6EE',
    backgroundColor: '#E7F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#274058',
  },
  chatTopRight: {
    width: 40,
  },
  chatList: {
    paddingBottom: 12,
    gap: 10,
  },
  chatBubble: {
    maxWidth: '86%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#25AFC0',
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCEAF3',
  },
  chatTextUser: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  chatTextAssistant: {
    color: '#2E3C50',
    fontSize: 14,
  },
  chatConfidenceText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#6D7B8E',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  metaBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaBadgeGreen:  { backgroundColor: '#ECFDF5' },
  metaBadgeYellow: { backgroundColor: '#FFFBEB' },
  metaBadgeRed:    { backgroundColor: '#FEF2F2' },
  metaBadgeGray:   { backgroundColor: '#F3F4F6' },
  metaBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  metaBadgeTextGreen:  { color: '#065F46' },
  metaBadgeTextYellow: { color: '#92400E' },
  metaBadgeTextRed:    { color: '#991B1B' },
  metaBadgeTextGray:   { color: '#4B5563' },
  metaLatency: {
    fontSize: 9,
    color: '#9CA3AF',
    marginLeft: 2,
  },
  sourceChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  sourceChipsLabel: {
    fontSize: 10,
    color: '#6D7B8E',
    fontWeight: '600',
    marginRight: 2,
  },
  sourceChip: {
    backgroundColor: '#EBF8FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#BEE3F8',
    maxWidth: 160,
  },
  sourceChipText: {
    fontSize: 10,
    color: '#2B6CB0',
    fontWeight: '500',
  },
  chatComposer: {
    marginTop: 8,
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: '#D4E4F1',
    backgroundColor: '#FFFFFF',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    color: '#2D3B4F',
  },
  chatSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#25AFC0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendBtnDisabled: {
    opacity: 0.6,
  },
});
