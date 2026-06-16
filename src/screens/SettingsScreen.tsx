import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';

import { NavItem } from '../components/NavItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AppSettings = {
  darkMode: boolean;
  pushNotifications: boolean;
  healthTips: boolean;
  sounds: boolean;
  language: 'English';
  appColor: 'Teal' | 'Blue' | 'Orange';
};

export function SettingsScreen({
  onBack,
  onGoHome,
  onGoHistory,
  onGoProfile,
  onGoChat,
  onGoUpgrade,
  onGoAppColor,
  onGoManageData,
  onGoPrivacyPolicy,
  profilePhotoUrl,
  settings,
  onChangeSettings,
}: {
  onBack: () => void;
  onGoHome: () => void;
  onGoHistory: () => void;
  onGoProfile: () => void;
  onGoChat: () => void;
  onGoUpgrade: () => void;
  onGoAppColor: () => void;
  onGoManageData: () => void;
  onGoPrivacyPolicy: () => void;
  profilePhotoUrl?: string;
  settings: AppSettings;
  onChangeSettings: (next: AppSettings) => void;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const contentWidth = Math.min(isDesktop ? 620 : 560, width - 20);
  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 8 : 10;
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 2 : 8);

  return (
    <View style={[styles.root, { paddingTop: topInset, paddingBottom: 0 }]}>
      <View style={[styles.content, { width: contentWidth }]}>
        <View style={styles.topRow}>
          <Pressable style={styles.topBtn} onPress={onBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#2AAFC0" />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.topBtn}>
              <MaterialCommunityIcons name="account-outline" size={22} color="#A5B2C1" />
            </View>
          )}
        </View>

        <Text style={styles.groupLabel}>General</Text>
        <View style={styles.card}>
          <Row icon="web" label="Language" subtitle="English" rightType="none" />
          <Row
            icon="weather-night"
            label="Dark Mode"
            rightType="switch"
            value={settings.darkMode}
            onToggle={(next) => onChangeSettings({ ...settings, darkMode: next })}
          />
          <Row icon="palette-outline" label="App Color" subtitle={settings.appColor} rightType="chevron" onPress={onGoAppColor} />
        </View>

        <Text style={styles.groupLabel}>Notifications</Text>
        <View style={styles.card}>
          <Row
            icon="bell-outline"
            label="Push Notifications"
            rightType="switch"
            value={settings.pushNotifications}
            onToggle={(next) => onChangeSettings({ ...settings, pushNotifications: next })}
          />
          <Row
            icon="lightbulb-on-outline"
            label="Health Tips"
            rightType="switch"
            value={settings.healthTips}
            onToggle={(next) => onChangeSettings({ ...settings, healthTips: next })}
          />
          <Row
            icon="volume-high"
            label="Sounds"
            rightType="switch"
            value={settings.sounds}
            onToggle={(next) => onChangeSettings({ ...settings, sounds: next })}
          />
        </View>

        <Text style={styles.groupLabel}>DATA & PRIVACY</Text>
        <View style={styles.card}>
          <Row icon="shield-check-outline" label="Manage Data" rightType="chevron" onPress={onGoManageData} />
          <Row icon="lock-outline" label="Privacy Policy" rightType="chevron" onPress={onGoPrivacyPolicy} />
        </View>
      </View>

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

function Row({
  icon,
  label,
  subtitle,
  rightType,
  value,
  onToggle,
  onPress,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  rightType: 'chevron' | 'switch' | 'none';
  value?: boolean;
  onToggle?: (next: boolean) => void;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={rightType === 'chevron' ? onPress : undefined}>
      <View style={styles.rowLeft}>
        <MaterialCommunityIcons name={icon as never} size={19} color="#2CB7C5" />
        <View>
          <Text style={styles.rowText}>{label}</Text>
          {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightType === 'chevron' ? (
        <MaterialCommunityIcons name="chevron-right" size={22} color="#B0BDCC" />
      ) : rightType === 'switch' ? (
        <Switch
          value={!!value}
          onValueChange={onToggle}
          trackColor={{ false: '#D6DFEA', true: '#55C3D1' }}
          thumbColor="#FFFFFF"
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D6EAF4',
    backgroundColor: '#EAF7FC',
  },
  title: {
    fontSize: 15,
    color: '#2D3F56',
    fontWeight: '700',
  },
  groupLabel: {
    marginTop: 8,
    marginBottom: 6,
    color: '#8A95A5',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5EDF6',
    backgroundColor: '#FFFFFF',
    padding: 8,
    gap: 8,
  },
  row: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E2ECF7',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowText: {
    color: '#2E3C52',
    fontSize: 14,
    fontWeight: '500',
  },
  rowSub: {
    color: '#8FA0B3',
    fontSize: 11,
    marginTop: 1,
  },
  bottomNav: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5EDF7',
    minHeight: 70,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centerBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F28D70',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
});
