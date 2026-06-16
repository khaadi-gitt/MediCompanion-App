import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { NavItem } from '../components/NavItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function UpgradeScreen({
  onBack,
  onGoHome,
  onGoHistory,
  onGoProfile,
  onGoChat,
}: {
  onBack: () => void;
  onGoHome: () => void;
  onGoHistory: () => void;
  onGoProfile: () => void;
  onGoChat: () => void;
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
          <Text style={styles.title}>Upgrade to Pro</Text>
          <Pressable style={styles.topBtn}>
            <MaterialCommunityIcons name="bell-outline" size={22} color="#A5B2C1" />
          </Pressable>
        </View>

        <View style={styles.banner}>
          <MaterialCommunityIcons name="star-four-points" size={48} color="#E9B15C" />
          <Text style={styles.bannerTitle}>Upgrade to MediCompanion Pro</Text>
          <Text style={styles.bannerSub}>Unlock all premium features!</Text>
        </View>

        <View style={styles.featuresCard}>
          <Feature label="Priority asking & faster responses" sub="Get faster answers and prioritized queries." />
          <Feature label="Advanced health insights" sub="Detailed and in-depth health analysis." />
          <Feature label="Sounds" sub="Personalized alert and assistant sounds." />

          <Text style={styles.groupLabel}>DATA & PRIVACY</Text>

          <Pressable style={[styles.planRow, styles.planActive]}>
            <View>
              <Text style={styles.planLabel}>Most Popular</Text>
              <Text style={styles.planName}>$9.99 / month</Text>
              <Text style={styles.planSub}>Billed monthly, cancel anytime</Text>
            </View>
            <Text style={styles.planPrice}>$9.99</Text>
          </Pressable>

          <Pressable style={styles.planRow}>
            <View>
              <Text style={styles.planName}>Annual Plan</Text>
              <Text style={styles.planSub}>Billed annually, cancel anytime</Text>
            </View>
            <Text style={styles.planPrice}>$79.99</Text>
          </Pressable>

          <Pressable style={styles.ctaBtn} onPress={onGoHome}>
            <Text style={styles.ctaText}>Upgrade Now</Text>
          </Pressable>
          <Pressable style={styles.restoreBtn}>
            <Text style={styles.restoreText}>Restore Purchase</Text>
          </Pressable>
        </View>

        <Text style={styles.terms}>By upgrading to Pro, you agree to our Terms of Service and Privacy Policy.</Text>
      </ScrollView>

      <View style={[styles.bottomNav, { width: contentWidth, marginBottom: bottomInset }]}> 
        <NavItem label="Home" icon="home" onPress={onGoHome} />
        <NavItem label="History" icon="history" onPress={onGoHistory} />
        <Pressable style={styles.centerBtn} onPress={onGoChat}>
          <MaterialCommunityIcons name="chat-processing-outline" size={22} color="#FFFFFF" />
        </Pressable>
        <NavItem label="Profile" icon="account-outline" onPress={onGoProfile} />
        <NavItem label="Upgrade Pro" icon="star-four-points-outline" accent active />
      </View>
    </View>
  );
}

function Feature({ label, sub }: { label: string; sub: string }) {
  return (
    <Pressable style={styles.featureRow}>
      <View>
        <Text style={styles.featureTitle}>{label}</Text>
        <Text style={styles.featureSub}>{sub}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#B0BDCC" />
    </Pressable>
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
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F2E5C9',
    backgroundColor: '#FFF7E9',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  bannerTitle: { marginTop: 6, fontSize: 21, color: '#31445A', fontWeight: '700' },
  bannerSub: { marginTop: 3, fontSize: 12, color: '#7C8898' },
  featuresCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5EDF6',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
  },
  featureRow: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E2ECF7',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featureTitle: { color: '#2E3C52', fontSize: 14, fontWeight: '500' },
  featureSub: { color: '#8D97A8', fontSize: 11, marginTop: 2 },
  groupLabel: { marginTop: 4, color: '#8A95A5', fontSize: 12, fontWeight: '600' },
  planRow: {
    minHeight: 66,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E2ECF7',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planActive: {
    borderColor: '#F1C777',
    backgroundColor: '#FFF8E9',
  },
  planLabel: { color: '#D39A44', fontSize: 11, fontWeight: '700' },
  planName: { color: '#2E3C52', fontSize: 17, fontWeight: '700' },
  planSub: { color: '#8D97A8', fontSize: 11, marginTop: 2 },
  planPrice: { color: '#2E3C52', fontSize: 24, fontWeight: '700' },
  ctaBtn: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#E9B15C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  restoreBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 34 },
  restoreText: { color: '#8B93A2', fontSize: 13, fontWeight: '600' },
  terms: { marginTop: 10, textAlign: 'center', color: '#8D95A3', fontSize: 11, lineHeight: 16, paddingHorizontal: 10 },
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
