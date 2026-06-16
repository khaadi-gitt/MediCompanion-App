import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { NavItem } from '../components/NavItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function HomeScreen({
  onGoChat,
  onGoProfile,
  onGoHistory,
  onGoSettings,
  onGoHelp,
  onGoAbout,
  onGoUpgrade,
  onLogout,
  userName,
}: {
  onGoChat: (text?: string) => void;
  onGoProfile: () => void;
  onGoHistory: () => void;
  onGoSettings: () => void;
  onGoHelp: () => void;
  onGoAbout: () => void;
  onGoUpgrade: () => void;
  onLogout: () => void;
  userName: string;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [homeQuery, setHomeQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const searchInputRef = useRef<TextInput | null>(null);
  const heroAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const topicsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(heroAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(cardsAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(topicsAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
    ]).start();
  }, [cardsAnim, heroAnim, topicsAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const onRefresh = () => {
    setRefreshing(true);
    setShowMenu(false);
    setShowQuick(false);
    setHomeQuery('');
    heroAnim.setValue(0);
    cardsAnim.setValue(0);
    topicsAnim.setValue(0);
    Animated.stagger(120, [
      Animated.timing(heroAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(cardsAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(topicsAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
    ]).start(() => setRefreshing(false));
  };

  const contentWidth = Math.min(isDesktop ? 700 : 520, width - 20);
  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 8 : 10;
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 2 : 8);
  const headerDrop = isDesktop ? 6 : 10;
  const menuIconSize = isDesktop ? 28 : 30;
  const menuBtnSize = isDesktop ? 42 : 44;
  const brandIconWidth = isDesktop ? 228 : 188;
  const brandIconHeight = isDesktop ? 72 : 58;
  const headingSize = isDesktop ? 40 : 26;
  const subSize = isDesktop ? 22 : 14;
  const searchTextSize = isDesktop ? 18 : 13;
  const cardTextSize = isDesktop ? 20 : 16;
  const topicTitleSize = isDesktop ? 28 : 20;
  const topicSeeAllSize = isDesktop ? 16 : 13;

  return (
    <View style={[styles.homeRoot, { paddingTop: topInset, paddingBottom: 0 }]}> 
      <ScrollView
        style={[styles.homeContent, { width: contentWidth }]}
        contentContainerStyle={styles.homeContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2CB7C5" colors={['#2CB7C5']} />}
      >
        <View style={[styles.homeTopRow, { marginTop: headerDrop }]}> 
          <View style={styles.homeEdgeLeft}> 
            <Pressable
              style={[styles.homeMenuButton, { width: menuBtnSize, height: menuBtnSize, borderRadius: menuBtnSize / 2 }]}
              onPress={() => {
                setShowMenu((v) => !v);
                setShowQuick(false);
              }}
            >
              <MaterialCommunityIcons name="menu" size={menuIconSize} color="#249EAF" />
            </Pressable>
          </View>
          <View style={styles.homeCenterBrand}>
            <View style={styles.homeBrandBadge}>
              <Image
                source={require('../../assets/branding/brand-lockup-transparent.png')}
                style={[styles.homeBrandIcon, { width: brandIconWidth, height: brandIconHeight }]}
                resizeMode="contain"
              />
            </View>
          </View>
          <View style={styles.homeRightRow}>
            <Pressable style={styles.homeIconButton} onPress={() => setShowQuick(false)}>
              <MaterialCommunityIcons name="bell-outline" size={22} color="#A1A9B8" />
            </Pressable>
            <Pressable
              style={styles.homeIconButton}
              onPress={() => {
                setShowQuick((v) => !v);
                setShowMenu(false);
              }}
            >
              <MaterialCommunityIcons name="dots-vertical" size={22} color="#A1A9B8" />
            </Pressable>
          </View>
        </View>
        {showMenu ? (
          <View style={styles.headerMenu}>
            <MenuItem icon="home-outline" label="Home" onPress={() => setShowMenu(false)} />
            <MenuItem
              icon="chat-plus-outline"
              label="New Chat"
              onPress={() => {
                setShowMenu(false);
                onGoChat();
              }}
            />
            <MenuItem
              icon="history"
              label="History"
              onPress={() => {
                setShowMenu(false);
                onGoHistory();
              }}
            />
            <MenuItem
              icon="account-outline"
              label="Profile"
              onPress={() => {
                setShowMenu(false);
                onGoProfile();
              }}
            />
            <MenuItem
              icon="cog-outline"
              label="Settings"
              onPress={() => {
                setShowMenu(false);
                onGoSettings();
              }}
            />
            <MenuItem
              icon="star-four-points-outline"
              label="Upgrade Pro"
              onPress={() => {
                setShowMenu(false);
                onGoUpgrade();
              }}
            />
            <MenuItem
              icon="logout"
              label="Log Out"
              onPress={() => {
                setShowMenu(false);
                onLogout();
              }}
            />
          </View>
        ) : null}
        {showQuick ? (
          <View style={styles.quickMenu}>
            <MenuItem
              icon="help-circle-outline"
              label="Help"
              onPress={() => {
                setShowQuick(false);
                onGoHelp();
              }}
            />
            <MenuItem
              icon="information-outline"
              label="About"
              onPress={() => {
                setShowQuick(false);
                onGoAbout();
              }}
            />
          </View>
        ) : null}

        <Animated.View
          style={[
            styles.heroPanel,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.homeWelcome, { fontSize: headingSize }]}>Welcome, {userName || 'User'}!</Text>
          <Text style={[styles.homeSub, { fontSize: subSize }]}>How can we assist you today?</Text>

          <Pressable style={styles.homeSearch} onPress={() => searchInputRef.current?.focus()}>
            <MaterialCommunityIcons name="magnify" size={22} color="#AAB1BE" />
            <TextInput
              ref={searchInputRef}
              value={homeQuery}
              onChangeText={setHomeQuery}
              onSubmitEditing={() => onGoChat(homeQuery.trim())}
              returnKeyType="search"
              placeholder="Ask your medical question..."
              placeholderTextColor="#8A93A4"
              style={[styles.homeSearchInput, { fontSize: searchTextSize }]}
            />
            <Pressable style={styles.homeSearchBtn} onPress={() => onGoChat(homeQuery.trim())}>
              <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFF" />
            </Pressable>
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[
            styles.homeCardsWrap,
            {
              opacity: cardsAnim,
              transform: [
                {
                  translateY: cardsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.cardPulseWrap,
              {
                transform: [
                  {
                    translateY: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -3],
                    }),
                  },
                ],
              },
            ]}
          >
            <Pressable style={styles.homeCard} onPress={() => onGoChat('I want to check my symptoms.')}>
              <Image source={require('../../assets/home/symptom-checker.png')} style={styles.homeCardImage} resizeMode="contain" />
              <Text style={[styles.homeCardText, { fontSize: cardTextSize }]}>Symptom Checker</Text>
            </Pressable>
          </Animated.View>
          <Animated.View
            style={[
              styles.cardPulseWrap,
              {
                transform: [
                  {
                    translateY: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-2, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Pressable style={styles.homeCard} onPress={() => onGoChat('Share some useful daily health tips.')}>
              <Image source={require('../../assets/home/health-tips.png')} style={styles.homeCardImage} resizeMode="contain" />
              <Text style={[styles.homeCardText, { fontSize: cardTextSize }]}>Health Tips</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={[
            styles.topicPanel,
            {
              opacity: topicsAnim,
              transform: [
                {
                  translateY: topicsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.topicTitleRow}>
            <Text style={[styles.topicTitle, { fontSize: topicTitleSize }]}>Popular Topics</Text>
            <Text style={[styles.topicSeeAll, { fontSize: topicSeeAllSize }]}>See All</Text>
          </View>
          <View style={styles.topicGrid}>
            <Pressable style={styles.topicCard} onPress={() => onGoChat('I have headache. What should I do?')}>
              <MaterialCommunityIcons name="head-outline" size={18} color="#1FA8B7" />
              <Text style={styles.topicCardText}>Headaches</Text>
            </Pressable>
            <Pressable style={styles.topicCard} onPress={() => onGoChat('How can I lose weight safely?')}>
              <MaterialCommunityIcons name="scale-bathroom" size={18} color="#48B5A4" />
              <Text style={styles.topicCardText}>Weight Loss</Text>
            </Pressable>
            <Pressable style={styles.topicCard} onPress={() => onGoChat('I have a skin rash. What could be the reason?')}>
              <MaterialCommunityIcons name="dots-hexagon" size={18} color="#E8899A" />
              <Text style={styles.topicCardText}>Skin Rash</Text>
            </Pressable>
            <Pressable style={styles.topicCard} onPress={() => onGoChat('What are early symptoms of diabetes?')}>
              <MaterialCommunityIcons name="fire" size={18} color="#E9A45A" />
              <Text style={styles.topicCardText}>Diabetes</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomNav, { width: contentWidth, marginBottom: bottomInset }]}> 
        <NavItem label="Home" icon="home" active />
        <NavItem label="History" icon="history" onPress={onGoHistory} />
        <Pressable style={styles.centerNewChat} onPress={() => onGoChat()}>
          <MaterialCommunityIcons name="chat-processing-outline" size={22} color="#FFFFFF" />
        </Pressable>
        <NavItem label="Profile" icon="account-outline" onPress={onGoProfile} />
        <NavItem label="Upgrade Pro" icon="star-four-points-outline" accent onPress={onGoUpgrade} />
      </View>
    </View>
  );
}

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <MaterialCommunityIcons name={icon as never} size={17} color="#2BAFC1" />
      <Text style={styles.menuItemText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  homeRoot: {
    flex: 1,
    alignItems: 'center',
  },
  homeContent: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 2,
  },
  homeContentContainer: {
    paddingBottom: 12,
  },
  homeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: '#D9E9F2',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerMenu: {
    position: 'absolute',
    top: 68,
    left: 0,
    zIndex: 20,
    width: 180,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFEAF4',
    padding: 8,
    gap: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quickMenu: {
    position: 'absolute',
    top: 68,
    right: 0,
    zIndex: 20,
    width: 170,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFEAF4',
    padding: 8,
    gap: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemText: {
    color: '#31445C',
    fontSize: 13,
    fontWeight: '500',
  },
  homeEdgeLeft: {
    width: 62,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  homeCenterBrand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeMenuButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F6FA',
    borderWidth: 1,
    borderColor: '#CFEAF2',
  },
  homeIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#DDEAF3',
  },
  homeBrandBadge: {
    width: 250,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBrandIcon: {
    width: 188,
    height: 58,
  },
  homeRightRow: {
    width: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  homeWelcome: {
    color: '#253247',
    fontWeight: '700',
  },
  homeSub: {
    marginTop: 3,
    color: '#7E8797',
  },
  heroPanel: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DAE8F2',
    backgroundColor: 'rgba(255,255,255,0.68)',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  homeSearch: {
    marginTop: 12,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.4,
    borderColor: '#D8E5F2',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    gap: 8,
  },
  homeSearchInput: {
    flex: 1,
    color: '#8A93A4',
    paddingVertical: 0,
  },
  homeSearchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#25AFC0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeCardsWrap: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  cardPulseWrap: {
    flex: 1,
  },
  homeCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFEAF4',
    minHeight: 116,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#1D6C82',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  homeCardText: {
    color: '#2F3B52',
    fontWeight: '500',
    textAlign: 'center',
  },
  homeCardImage: {
    width: 66,
    height: 66,
  },
  symptomIconWrap: {
    position: 'relative',
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F8FB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CDECF2',
  },
  symptomIconBadge: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F18B6E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  tipsIconWrap: {
    position: 'relative',
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F8FB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CDECF2',
  },
  tipsIconBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1A46B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  topicPanel: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCE9F3',
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#1D6C82',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topicTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicTitle: {
    color: '#28364C',
    fontWeight: '600',
  },
  topicSeeAll: {
    color: '#2AAFC0',
    fontWeight: '600',
  },
  topicGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  topicCard: {
    width: '49%',
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#F4FAFD',
    borderWidth: 1,
    borderColor: '#DCECF5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 10,
  },
  topicCardText: {
    color: '#3B4E66',
    fontSize: 13,
    fontWeight: '600',
  },
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
  centerNewChat: {
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
