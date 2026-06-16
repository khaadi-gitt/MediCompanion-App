import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Platform, Pressable, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { NavItem } from '../components/NavItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function AboutScreen({
  onBack,
  onGoHome,
  onGoHistory,
  onGoProfile,
  onGoChat,
  onGoUpgrade,
  profilePhotoUrl,
}: {
  onBack: () => void;
  onGoHome: () => void;
  onGoHistory: () => void;
  onGoProfile: () => void;
  onGoChat: () => void;
  onGoUpgrade: () => void;
  profilePhotoUrl?: string;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const contentWidth = Math.min(isDesktop ? 620 : 560, width - 20);
  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 8 : 10;
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 2 : 8);

  return (
    <View style={[styles.root, { paddingTop: topInset, paddingBottom: 0 }]}> 
      <ScrollView style={{ width: contentWidth }} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={styles.topBtn} onPress={onBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#2AAFC0" />
          </Pressable>
          <Text style={styles.title}>About</Text>
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.topBtn}>
              <MaterialCommunityIcons name="account-outline" size={22} color="#A5B2C1" />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.h1}>MediCompanion</Text>
          <Text style={styles.p}>Version: 1.0.0</Text>
          <Text style={styles.p}>
            MediCompanion is an AI-powered educational health assistant designed to simplify medical information for everyone.
          </Text>
          <Text style={styles.p}>For academic use and demo purposes.</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, { width: contentWidth, marginBottom: bottomInset }]}> 
        <NavItem label="Home" icon="home" onPress={onGoHome} />
        <NavItem label="History" icon="history" onPress={onGoHistory} />
        <Pressable style={styles.centerBtn} onPress={onGoChat}>
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
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D6EAF4',
    backgroundColor: '#EAF7FC',
  },
  title: { fontSize: 22, color: '#2D3F56', fontWeight: '700' },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5EDF6',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  h1: { fontSize: 20, color: '#2E3C52', fontWeight: '700' },
  p: { fontSize: 13, color: '#748194', lineHeight: 20 },
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
