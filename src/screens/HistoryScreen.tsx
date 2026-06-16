import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { NavItem } from '../components/NavItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HistoryItem = {
  id: string;
  title: string;
  confidenceLabel?: 'low' | 'medium' | 'high' | 'very_low';
  sources?: string[];
  ragUsed?: boolean;
  faithfulnessScore?: number;
  halluScore?: number;
  llmUsed?: string;
  totalLatencyMs?: number;
};

export function HistoryScreen({
  items,
  onBack,
  onGoHome,
  onGoProfile,
  onGoChat,
  onClearHistory,
  onGoUpgrade,
}: {
  items: HistoryItem[];
  onBack: () => void;
  onGoHome: () => void;
  onGoProfile: () => void;
  onGoChat: (sessionId?: string) => void;
  onClearHistory: () => void;
  onGoUpgrade: () => void;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const contentWidth = Math.min(isDesktop ? 620 : 560, width - 20);
  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 8 : 10;
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 2 : 8);

  const latestSessionItems = useMemo(() => {
    return items.slice(0, 30);
  }, [items]);

  return (
    <View style={[styles.root, { paddingTop: topInset, paddingBottom: 0 }]}> 
      <ScrollView style={{ width: contentWidth }} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={styles.topBtn} onPress={onBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#2AAFC0" />
          </Pressable>
          <Text style={styles.title}>History</Text>
          <Pressable style={styles.topBtn} onPress={onClearHistory}>
            <MaterialCommunityIcons name="delete-outline" size={22} color="#A5B2C1" />
          </Pressable>
        </View>

        <View style={styles.card}>
          {latestSessionItems.length === 0 ? (
            <Text style={styles.emptyText}>No history yet. Start a chat to save history.</Text>
          ) : null}
          {latestSessionItems.map((item) => (
            <Pressable style={styles.row} key={item.id} onPress={() => onGoChat(item.id)}>
              <View style={styles.rowLeft}>
                <MaterialCommunityIcons name="history" size={18} color="#2CB7C5" />
                <View style={styles.rowBody}>
                  <Text style={styles.rowText} numberOfLines={1}>{item.title}</Text>
                  {item.ragUsed ? (
                    <View style={styles.metaRow}>
                      {typeof item.confidenceLabel === 'string' ? (
                        <View style={[
                          styles.badge,
                          item.confidenceLabel === 'high'   ? styles.badgeGreen  :
                          item.confidenceLabel === 'medium' ? styles.badgeYellow : styles.badgeRed,
                        ]}>
                          <Text style={[
                            styles.badgeText,
                            item.confidenceLabel === 'high'   ? styles.badgeTextGreen  :
                            item.confidenceLabel === 'medium' ? styles.badgeTextYellow : styles.badgeTextRed,
                          ]}>
                            {item.confidenceLabel === 'very_low' ? 'Very Low' : item.confidenceLabel.charAt(0).toUpperCase() + item.confidenceLabel.slice(1)}
                          </Text>
                        </View>
                      ) : null}
                      {typeof item.faithfulnessScore === 'number' ? (
                        <View style={[
                          styles.badge,
                          item.faithfulnessScore > 0.6  ? styles.badgeGreen  :
                          item.faithfulnessScore > 0.35 ? styles.badgeYellow : styles.badgeRed,
                        ]}>
                          <Text style={[
                            styles.badgeText,
                            item.faithfulnessScore > 0.6  ? styles.badgeTextGreen  :
                            item.faithfulnessScore > 0.35 ? styles.badgeTextYellow : styles.badgeTextRed,
                          ]}>
                            Faithful {Math.round(item.faithfulnessScore * 100)}%
                          </Text>
                        </View>
                      ) : null}
                      {typeof item.halluScore === 'number' && item.halluScore > 0.4 ? (
                        <View style={[styles.badge, styles.badgeRed]}>
                          <Text style={[styles.badgeText, styles.badgeTextRed]}>⚠ Unverified</Text>
                        </View>
                      ) : null}
                      {item.llmUsed ? (
                        <View style={[styles.badge, styles.badgeGray]}>
                          <Text style={[styles.badgeText, styles.badgeTextGray]}>
                            {item.llmUsed === 'ollama' ? 'Ollama' : 'OpenAI'}
                          </Text>
                        </View>
                      ) : null}
                      {typeof item.totalLatencyMs === 'number' ? (
                        <Text style={styles.metaLatency}>{(item.totalLatencyMs / 1000).toFixed(1)}s</Text>
                      ) : null}
                      {item.sources && item.sources.length > 0 ? (
                        <Text style={styles.metaSource} numberOfLines={1}>
                          {item.sources[0]}{item.sources.length > 1 ? ` +${item.sources.length - 1}` : ''}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#B0BDCC" />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, { width: contentWidth, marginBottom: bottomInset }]}> 
        <NavItem label="Home" icon="home" onPress={onGoHome} />
        <NavItem label="History" icon="history" active />
        <Pressable style={styles.centerBtn} onPress={() => onGoChat()}>
          <MaterialCommunityIcons name="chat-processing-outline" size={22} color="#FFFFFF" />
        </Pressable>
        <NavItem label="Profile" icon="account-outline" onPress={onGoProfile} />
        <NavItem label="Upgrade Pro" icon="star-four-points-outline" accent onPress={onGoUpgrade} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF7FC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D6EAF4',
  },
  title: { fontSize: 22, color: '#2D3F56', fontWeight: '700' },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5EDF6',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
  },
  row: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E2ECF7',
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowText: { color: '#2E3C52', fontSize: 13, fontWeight: '500' },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeGreen:  { backgroundColor: '#ECFDF5' },
  badgeYellow: { backgroundColor: '#FFFBEB' },
  badgeRed:    { backgroundColor: '#FEF2F2' },
  badgeGray:   { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 9, fontWeight: '600' },
  badgeTextGreen:  { color: '#065F46' },
  badgeTextYellow: { color: '#92400E' },
  badgeTextRed:    { color: '#991B1B' },
  badgeTextGray:   { color: '#4B5563' },
  metaLatency: { fontSize: 9, color: '#9CA3AF' },
  metaSource:  { fontSize: 9, color: '#2B6CB0', fontStyle: 'italic', flexShrink: 1 },
  emptyText: { color: '#6A7C92', fontSize: 13, paddingHorizontal: 4, paddingVertical: 8 },
  bottomNav: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5EDF7',
    minHeight: 74,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F28D70',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
});
