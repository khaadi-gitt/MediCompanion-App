import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Platform, Pressable, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { NavItem } from '../components/NavItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_ORANGE } from '../theme';

type ProfilePayload = {
  fullName: string;
  email: string;
  photoUrl: string;
};

export function ProfileScreen({
  profile,
  onGoHome,
  onGoHistory,
  onGoEditProfile,
  onGoHelp,
  onGoAbout,
  onGoDisclaimer,
  onGoUpgrade,
  onGoChat,
  onLogout,
}: {
  profile: ProfilePayload;
  onGoHome: () => void;
  onGoHistory: () => void;
  onGoEditProfile: () => void;
  onGoHelp: () => void;
  onGoAbout: () => void;
  onGoDisclaimer: () => void;
  onGoUpgrade: () => void;
  onGoChat: () => void;
  onLogout: () => void;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const contentWidth = Math.min(isDesktop ? 620 : 560, width - 20);
  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 8 : 10;
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 2 : 8);

  const displayName = profile.fullName || 'Sarah Mitchell';
  const displayEmail = profile.email || 'sarahmitchell@email.com';

  return (
    <View style={[styles.root, { paddingTop: topInset, paddingBottom: 0 }]}> 
      <ScrollView style={{ width: contentWidth }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerArea}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <MaterialCommunityIcons name="account" size={42} color="#7FA4B2" />
            </View>
          )}
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{displayEmail}</Text>

          <Pressable style={styles.editBtn} onPress={onGoEditProfile}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>
        </View>

        <View style={styles.menuCard}>
          <SectionItem icon="account-circle-outline" label="Personal Information" onPress={onGoEditProfile} />
          <SectionItem icon="history" label="History" onPress={onGoHistory} />
          <SectionItem icon="help-circle-outline" label="Help Center" onPress={onGoHelp} />
          <SectionItem icon="information-outline" label="About Us" onPress={onGoAbout} />
          <SectionItem icon="alert-circle-outline" label="Disclaimer" onPress={onGoDisclaimer} />
          <Pressable style={styles.upgradeRow} onPress={onGoUpgrade}>
            <MaterialCommunityIcons name="star-four-points-outline" size={17} color="#FFFFFF" />
            <Text style={styles.upgradeText}>Upgrade to Pro</Text>
          </Pressable>
          <Pressable style={styles.logoutRow} onPress={onLogout}>
            <MaterialCommunityIcons name="power" size={16} color={BRAND_ORANGE} />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, { width: contentWidth, marginBottom: bottomInset }]}> 
        <NavItem label="Home" icon="home" onPress={onGoHome} />
        <NavItem label="History" icon="history" onPress={onGoHistory} />
        <Pressable style={styles.centerBtn} onPress={onGoChat}>
          <MaterialCommunityIcons name="chat-processing-outline" size={22} color="#FFFFFF" />
        </Pressable>
        <NavItem label="Profile" icon="account-outline" active />
        <NavItem label="Upgrade Pro" icon="star-four-points-outline" accent onPress={onGoUpgrade} />
      </View>
    </View>
  );
}

function SectionItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.sectionItem} onPress={onPress}>
      <View style={styles.sectionLeft}>
        <MaterialCommunityIcons name={icon as never} size={18} color="#2CAFC1" />
        <Text style={styles.sectionText}>{label}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#B1BCCB" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  headerArea: { alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#F2FAFD',
  },
  avatarPlaceholder: {
    backgroundColor: '#EAF5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginTop: 8, fontSize: 14.5, fontWeight: '700', color: '#2C3C53' },
  email: { marginTop: 3, fontSize: 13, color: '#7D8795' },
  editBtn: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E8F1',
    backgroundColor: '#F5FBFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editBtnText: { color: '#4CAFC0', fontSize: 12, fontWeight: '600' },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5EDF6',
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginBottom: 18,
    gap: 8,
  },
  sectionItem: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E3EBF5',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionText: { color: '#2C3A4E', fontSize: 14, fontWeight: '500' },
  upgradeRow: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#F2B76C',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  upgradeText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  logoutRow: {
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF4',
    backgroundColor: '#FAFCFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  logoutText: { color: '#5C6676', fontSize: 14, fontWeight: '600' },
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
