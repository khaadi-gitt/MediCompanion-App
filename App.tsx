import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, BackHandler, Platform, SafeAreaView, StyleSheet } from 'react-native';

import { BackgroundDecor } from './src/components/BackgroundDecor';
import { AboutScreen } from './src/screens/AboutScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { DisclaimerScreen } from './src/screens/DisclaimerScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { HelpScreen } from './src/screens/HelpScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { LanguageScreen } from './src/screens/LanguageScreen';
import { ManageDataScreen } from './src/screens/ManageDataScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { PrivacyPolicyScreen } from './src/screens/PrivacyPolicyScreen';
import type { AppSettings } from './src/screens/SettingsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { SplashScreen } from './src/screens/SplashScreen';
import { TextSizeScreen } from './src/screens/TextSizeScreen';
import { UpgradeScreen } from './src/screens/UpgradeScreen';
import { APP_BG_DARK, APP_BG_LIGHT } from './src/theme';
import type { Screen } from './src/types/navigation';

type ProfilePayload = {
  fullName: string;
  email: string;
  photoUrl: string;
  photoDataUrl?: string;
};

type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  photoUrl: string;
};

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  confidenceLabel?: 'low' | 'medium' | 'high' | 'very_low';
  sources?: string[];
  ragUsed?: boolean;
  faithfulnessScore?: number;
  halluScore?: number;
  llmUsed?: string;
  totalLatencyMs?: number;
};

type ChatSession = {
  id: string;
  title: string;
  messages: ChatMsg[];
  updatedAt: number;
};

export default function App() {
  const backendApiBase = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
  const [screen, setScreen] = useState<Screen>('splash');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chatPrefill, setChatPrefill] = useState('');
  const [chatSessionsByUser, setChatSessionsByUser] = useState<Record<string, ChatSession[]>>({});
  const [activeChatSessionByUser, setActiveChatSessionByUser] = useState<Record<string, string | null>>({});
  const [authLoading, setAuthLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: false,
    pushNotifications: true,
    healthTips: true,
    sounds: true,
    language: 'English',
    appColor: 'Teal',
  });
  const [profile, setProfile] = useState<ProfilePayload>({
    fullName: 'Sarah Mitchell',
    email: 'sarahmitchell@email.com',
    photoUrl: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentUserId(null);
      setScreen('login');
    }, 1100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      const target = getBackTarget(screen);
      if (!target) return false;
      setScreen(target);
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [screen]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setAuthLoading(true);
      if (!backendApiBase) {
        Alert.alert('Login failed', 'EXPO_PUBLIC_API_BASE_URL is missing in .env');
        return;
      }

      const resp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        Alert.alert('Login failed', String(data?.error || 'Invalid email or password.'));
        return;
      }

      const user = normalizeAuthUser(data?.user);
      setCurrentUserId(user.id);
      setProfile({
        fullName: user.fullName,
        email: user.email,
        photoUrl: user.photoUrl,
      });

      // Fetch history from backend
      try {
        const histResp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/api/chat/history?user_id=${user.id}`);
        const histData = await histResp.json();
        if (histResp.ok && Array.isArray(histData.sessions)) {
          const sessions = histData.sessions.map((s: any) => ({
            id: s.id,
            title: s.title,
            updatedAt: Date.now(),
            messages: [], // Messages will be loaded when the session is opened
          }));
          setChatSessionsByUser((prev) => ({ ...prev, [user.id]: sessions }));
        }
      } catch (e) {
        console.error('Failed to fetch chat history:', e);
      }

      setScreen('home');
    } catch (error: any) {
      Alert.alert('Login failed', String(error?.message || 'Network error. Please try again.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook', accessToken: string) => {
    try {
      setAuthLoading(true);
      if (!backendApiBase) {
        Alert.alert('Login failed', 'EXPO_PUBLIC_API_BASE_URL is missing in .env');
        return;
      }

      const resp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, access_token: accessToken }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        Alert.alert('Login failed', String(data?.error || 'Social login failed.'));
        return;
      }

      const user = normalizeAuthUser(data?.user);
      setCurrentUserId(user.id);
      setProfile({ fullName: user.fullName, email: user.email, photoUrl: user.photoUrl });

      try {
        const histResp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/api/chat/history?user_id=${user.id}`);
        const histData = await histResp.json();
        if (histResp.ok && Array.isArray(histData.sessions)) {
          const sessions = histData.sessions.map((s: any) => ({
            id: s.id, title: s.title, updatedAt: Date.now(), messages: [],
          }));
          setChatSessionsByUser((prev) => ({ ...prev, [user.id]: sessions }));
        }
      } catch (e) {
        console.error('Failed to fetch chat history:', e);
      }

      setScreen('home');
    } catch (error: any) {
      Alert.alert('Login failed', String(error?.message || 'Network error. Please try again.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUpSendOtp = async (payload: { fullName: string; email: string; password: string; photoUrl: string }) => {
    try {
      setAuthLoading(true);
      if (!backendApiBase) {
        Alert.alert('Signup failed', 'EXPO_PUBLIC_API_BASE_URL is missing in .env');
        return;
      }

      const resp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/auth/signup/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        Alert.alert('Signup failed', String(data?.error || 'Could not send OTP.'));
        return;
      }
      Alert.alert('OTP sent', 'Check your email for the 6-digit OTP.');
    } catch (error: any) {
      Alert.alert('Signup failed', String(error?.message || 'Network error. Please try again.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUpVerifyOtp = async (email: string, otp: string) => {
    try {
      setAuthLoading(true);
      if (!backendApiBase) {
        Alert.alert('Signup failed', 'EXPO_PUBLIC_API_BASE_URL is missing in .env');
        return;
      }
      const resp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/auth/signup/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        Alert.alert('OTP verify failed', String(data?.error || 'Invalid OTP.'));
        return;
      }
      const user = normalizeAuthUser(data?.user);
      setCurrentUserId(user.id);
      setProfile({
        fullName: user.fullName,
        email: user.email,
        photoUrl: user.photoUrl,
      });

      // Fetch history from backend
      try {
        const histResp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/api/chat/history?user_id=${user.id}`);
        const histData = await histResp.json();
        if (histResp.ok && Array.isArray(histData.sessions)) {
          const sessions = histData.sessions.map((s: any) => ({
            id: s.id,
            title: s.title,
            updatedAt: Date.now(),
            messages: [],
          }));
          setChatSessionsByUser((prev) => ({ ...prev, [user.id]: sessions }));
        }
      } catch (e) {
        console.error('Failed to fetch chat history:', e);
      }

      setScreen('home');
    } catch (error: any) {
      Alert.alert('OTP verify failed', String(error?.message || 'Network error. Please try again.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordResetSendOtp = async (email: string) => {
    try {
      setAuthLoading(true);
      if (!backendApiBase) {
        Alert.alert('Reset failed', 'EXPO_PUBLIC_API_BASE_URL is missing in .env');
        return;
      }
      const resp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/auth/password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        Alert.alert('Reset failed', String(data?.error || 'Could not send OTP.'));
        return;
      }
      Alert.alert('OTP sent', 'Check your email for the reset OTP.');
    } catch (error: any) {
      Alert.alert('Reset failed', String(error?.message || 'Network error. Please try again.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordResetConfirm = async (payload: { email: string; otp: string; newPassword: string }) => {
    try {
      setAuthLoading(true);
      if (!backendApiBase) {
        Alert.alert('Reset failed', 'EXPO_PUBLIC_API_BASE_URL is missing in .env');
        return;
      }
      const resp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        Alert.alert('Reset failed', String(data?.error || 'Could not reset password.'));
        return;
      }
      Alert.alert('Success', 'Password reset successfully. Please login.');
      setScreen('login');
    } catch (error: any) {
      Alert.alert('Reset failed', String(error?.message || 'Network error. Please try again.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setCurrentUserId(null);
    setScreen('login');
  };

  const handleExportChatHistoryPdf = async () => {
    try {
      if (!currentSessions.length) {
        Alert.alert('Export Data', 'No chat history found to export.');
        return;
      }
      const html = buildChatHistoryHtml({
        userName: profile.fullName,
        userEmail: profile.email,
        sessions: currentSessions,
      });
      const { uri } = await Print.printToFileAsync({ html });
      const target = `${(FileSystem.documentDirectory || FileSystem.cacheDirectory || '').replace(/\/+$/, '')}/medicompanion-chat-history.pdf`;
      if (target) {
        await FileSystem.copyAsync({ from: uri, to: target });
      }
      const finalUri = target || uri;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(finalUri, { mimeType: 'application/pdf', dialogTitle: 'Export Chat History' });
      }
      Alert.alert('Export Data', `Chat history exported successfully.\n\n${finalUri}`);
    } catch (error: any) {
      Alert.alert('Export Data Failed', String(error?.message || 'Could not export chat history PDF.'));
    }
  };

  const handleDeleteAccountRequest = async () => {
    try {
      if (!currentUserId) {
        Alert.alert('Delete Account', 'Please login first.');
        return;
      }
      if (!backendApiBase) {
        Alert.alert('Delete Account', 'EXPO_PUBLIC_API_BASE_URL is missing in .env');
        return;
      }

      const resp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/account/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        Alert.alert('Delete Account Failed', String(data?.error || 'Could not delete account.'));
        return;
      }

      const userKey = currentUserId;
      setChatSessionsByUser((prev) => {
        const next = { ...prev };
        delete next[userKey];
        return next;
      });
      setActiveChatSessionByUser((prev) => {
        const next = { ...prev };
        delete next[userKey];
        return next;
      });
      setCurrentUserId(null);
      setProfile({ fullName: '', email: '', photoUrl: '' });
      setScreen('login');
      Alert.alert('Delete Account', 'Your account has been deleted successfully.');
    } catch (error: any) {
      Alert.alert('Delete Account Failed', String(error?.message || 'Network error.'));
    }
  };

  const historyKey = currentUserId || 'guest';
  const currentSessions = chatSessionsByUser[historyKey] || [];
  const activeSessionId = activeChatSessionByUser[historyKey] || null;

  const ensureActiveChatSession = () => {
    const existing = activeChatSessionByUser[historyKey];
    if (existing && currentSessions.some((s) => s.id === existing)) return existing;

    const id = createUuid();
    const next: ChatSession = {
      id,
      title: 'New Chat',
      updatedAt: Date.now(),
      messages: [
        {
          id: `m-${Date.now()}`,
          role: 'assistant',
          text: 'Hello! Ask any medical question and I will explain it in simple language.',
        },
      ],
    };
    setChatSessionsByUser((prev) => ({ ...prev, [historyKey]: [next, ...(prev[historyKey] || [])] }));
    setActiveChatSessionByUser((prev) => ({ ...prev, [historyKey]: id }));
    return id;
  };

  const handleAppendSessionMessage = (msg: ChatMsg) => {
    const sid = ensureActiveChatSession();
    setChatSessionsByUser((prev) => {
      const list = prev[historyKey] || [];
      const next = list.map((s) => {
        if (s.id !== sid) return s;
        const nextTitle =
          s.title === 'New Chat' && msg.role === 'user'
            ? msg.text.slice(0, 60)
            : s.title;
        return {
          ...s,
          title: nextTitle || s.title,
          updatedAt: Date.now(),
          messages: [...s.messages, msg],
        };
      });
      return { ...prev, [historyKey]: next.sort((a, b) => b.updatedAt - a.updatedAt) };
    });
  };

  const handleClearLocalHistory = () => {
    setChatSessionsByUser((prev) => ({ ...prev, [historyKey]: [] }));
    setActiveChatSessionByUser((prev) => ({ ...prev, [historyKey]: null }));
  };

  const handleOpenChatSession = (sessionId: string, prefill = '') => {
    setActiveChatSessionByUser((prev) => ({ ...prev, [historyKey]: sessionId }));
    setChatPrefill(prefill);
    setScreen('chat');
  };

  const handleStartNewChat = (prefill = '') => {
    const id = createUuid();
    const next: ChatSession = {
      id,
      title: 'New Chat',
      updatedAt: Date.now(),
      messages: [
        {
          id: `m-${Date.now()}`,
          role: 'assistant',
          text: 'Hello! Ask any medical question and I will explain it in simple language.',
        },
      ],
    };
    setChatSessionsByUser((prev) => ({ ...prev, [historyKey]: [next, ...(prev[historyKey] || [])] }));
    setActiveChatSessionByUser((prev) => ({ ...prev, [historyKey]: id }));
    setChatPrefill(prefill);
    setScreen('chat');
  };

  const handleOpenChat = (sessionId?: string, prefill = '') => {
    if (sessionId) {
      handleOpenChatSession(sessionId, prefill);
      return;
    }
    handleStartNewChat(prefill);
  };

  const sessionForChat =
    currentSessions.find((s) => s.id === (activeSessionId || '')) ||
    currentSessions[0] ||
    null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: settings.darkMode ? APP_BG_DARK : getLightBg(settings.appColor) }]}>
      <StatusBar style={settings.darkMode ? 'light' : 'dark'} />
      <BackgroundDecor darkMode={settings.darkMode} appColor={settings.appColor} />
      {screen === 'splash' ? (
        <SplashScreen />
      ) : screen === 'forgot_password' ? (
        <ForgotPasswordScreen
          onGoBack={() => setScreen('login')}
          onGoLogin={() => setScreen('login')}
          onSendOtp={handlePasswordResetSendOtp}
          onResetPassword={handlePasswordResetConfirm}
          loading={authLoading}
        />
      ) : screen === 'edit_profile' ? (
        <EditProfileScreen
          profile={profile}
          onBack={() => setScreen('profile')}
          onSave={async (next) => {
            try {
              if (!currentUserId) {
                setProfile(next);
                setScreen('profile');
                return;
              }
              if (!backendApiBase) {
                Alert.alert('Profile update failed', 'EXPO_PUBLIC_API_BASE_URL is missing in .env');
                return;
              }

              let photoDataUrl = '';
              const photoUrlTrim = String(next.photoUrl || '').trim();
              const incomingDataUrl = String(next.photoDataUrl || '').trim();
              if (incomingDataUrl.startsWith('data:image/')) {
                photoDataUrl = incomingDataUrl;
              }
              const isRemotePhoto = /^https?:\/\//i.test(photoUrlTrim);
              if (!photoDataUrl && photoUrlTrim && !isRemotePhoto) {
                let sourceUri = photoUrlTrim;
                if (sourceUri.startsWith('content://')) {
                  const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
                  if (!cacheDir) throw new Error('Local storage not available for image processing.');
                  const tmpPath = `${cacheDir}profile-${Date.now()}.jpg`;
                  await FileSystem.copyAsync({ from: sourceUri, to: tmpPath });
                  sourceUri = tmpPath;
                }
                const b64 = await FileSystem.readAsStringAsync(sourceUri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                if (!b64) {
                  throw new Error('Could not convert selected image to base64.');
                }
                photoDataUrl = `data:image/jpeg;base64,${b64}`;
              }

              const resp = await fetch(`${backendApiBase.replace(/\/+$/, '')}/profile/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: currentUserId,
                  fullName: next.fullName,
                  email: next.email,
                  photoUrl: photoDataUrl ? '' : photoUrlTrim,
                  photoDataUrl,
                }),
              });
              const data = await resp.json();
              if (!resp.ok) {
                Alert.alert('Profile update failed', String(data?.error || 'Could not update profile.'));
                return;
              }

              const user = normalizeAuthUser(data?.user);
              setProfile({
                fullName: user.fullName,
                email: user.email,
                photoUrl: user.photoUrl,
              });
              setScreen('profile');
            } catch (error: any) {
              Alert.alert('Profile update failed', String(error?.message || 'Network error.'));
            }
          }}
        />
      ) : screen === 'help' ? (
        <HelpScreen
          onBack={() => setScreen('profile')}
          onGoHome={() => setScreen('home')}
          onGoHistory={() => setScreen('history')}
          onGoProfile={() => setScreen('profile')}
          onGoChat={() => {
            handleStartNewChat();
          }}
          onGoUpgrade={() => setScreen('upgrade')}
          profilePhotoUrl={profile.photoUrl}
        />
      ) : screen === 'about' ? (
        <AboutScreen
          onBack={() => setScreen('profile')}
          onGoHome={() => setScreen('home')}
          onGoHistory={() => setScreen('history')}
          onGoProfile={() => setScreen('profile')}
          onGoChat={() => {
            handleStartNewChat();
          }}
          onGoUpgrade={() => setScreen('upgrade')}
          profilePhotoUrl={profile.photoUrl}
        />
      ) : screen === 'disclaimer' ? (
        <DisclaimerScreen
          onBack={() => setScreen('profile')}
          onGoHome={() => setScreen('home')}
          onGoHistory={() => setScreen('history')}
          onGoProfile={() => setScreen('profile')}
          onGoChat={() => {
            handleStartNewChat();
          }}
          onGoUpgrade={() => setScreen('upgrade')}
          profilePhotoUrl={profile.photoUrl}
        />
      ) : screen === 'history' ? (
        <HistoryScreen
          items={currentSessions.map((s) => {
            const lastAssistant = [...s.messages].reverse().find((m) => m.role === 'assistant' && m.ragUsed);
            return {
              id: s.id,
              title: s.title,
              confidenceLabel: lastAssistant?.confidenceLabel,
              sources: lastAssistant?.sources,
              ragUsed: lastAssistant?.ragUsed,
              faithfulnessScore: lastAssistant?.faithfulnessScore,
              halluScore: lastAssistant?.halluScore,
              llmUsed: lastAssistant?.llmUsed,
              totalLatencyMs: lastAssistant?.totalLatencyMs,
            };
          })}
          onBack={() => setScreen('home')}
          onGoHome={() => setScreen('home')}
          onGoProfile={() => setScreen('profile')}
          onGoChat={(sessionId?: string) => {
            handleOpenChat(sessionId);
          }}
          onClearHistory={handleClearLocalHistory}
          onGoUpgrade={() => setScreen('upgrade')}
        />
      ) : screen === 'upgrade' ? (
        <UpgradeScreen
          onBack={() => setScreen('home')}
          onGoHome={() => setScreen('home')}
          onGoHistory={() => setScreen('history')}
          onGoProfile={() => setScreen('profile')}
          onGoChat={() => {
            handleStartNewChat();
          }}
        />
      ) : screen === 'settings' ? (
        <SettingsScreen
          onBack={() => setScreen('home')}
          onGoHome={() => setScreen('home')}
          onGoHistory={() => setScreen('history')}
          onGoProfile={() => setScreen('profile')}
          onGoChat={() => {
            handleStartNewChat();
          }}
          onGoUpgrade={() => setScreen('upgrade')}
          onGoAppColor={() => setScreen('settings_text_size')}
          onGoManageData={() => setScreen('settings_manage_data')}
          onGoPrivacyPolicy={() => setScreen('settings_privacy_policy')}
          profilePhotoUrl={profile.photoUrl}
          settings={settings}
          onChangeSettings={setSettings}
        />
      ) : screen === 'settings_language' ? (
        <LanguageScreen
          value={'English'}
          onBack={() => setScreen('settings')}
          onChange={() => setSettings((prev) => ({ ...prev, language: 'English' }))}
          profilePhotoUrl={profile.photoUrl}
        />
      ) : screen === 'settings_text_size' ? (
        <TextSizeScreen
          value={settings.appColor}
          onBack={() => setScreen('settings')}
          onChange={(appColor) => setSettings((prev) => ({ ...prev, appColor }))}
          profilePhotoUrl={profile.photoUrl}
        />
      ) : screen === 'settings_manage_data' ? (
        <ManageDataScreen
          onBack={() => setScreen('settings')}
          profilePhotoUrl={profile.photoUrl}
          onClearChatHistory={() => {
            handleClearLocalHistory();
            Alert.alert('Manage Data', 'Chat history cleared.');
          }}
          onExportData={handleExportChatHistoryPdf}
          onDeleteAccountRequest={handleDeleteAccountRequest}
        />
      ) : screen === 'settings_privacy_policy' ? (
        <PrivacyPolicyScreen onBack={() => setScreen('settings')} profilePhotoUrl={profile.photoUrl} />
      ) : screen === 'profile' ? (
        <ProfileScreen
          profile={profile}
          onGoHome={() => setScreen('home')}
          onGoHistory={() => setScreen('history')}
          onGoEditProfile={() => setScreen('edit_profile')}
          onGoHelp={() => setScreen('help')}
          onGoAbout={() => setScreen('about')}
          onGoDisclaimer={() => setScreen('disclaimer')}
          onGoUpgrade={() => setScreen('upgrade')}
          onGoChat={() => {
            handleStartNewChat();
          }}
          onLogout={handleLogout}
        />
      ) : screen === 'chat' ? (
        <ChatScreen
          userId={currentUserId}
          sessionId={activeSessionId}
          sessionMessages={
            sessionForChat?.messages || [
              {
                id: `m-${Date.now()}`,
                role: 'assistant',
                text: 'Hello! Ask any medical question and I will explain it in simple language.',
              },
            ]
          }
          initialText={chatPrefill}
          onAppendMessage={handleAppendSessionMessage}
          onGoHome={() => setScreen('home')}
        />
      ) : screen === 'home' ? (
        <HomeScreen
          userName={profile.fullName}
          onGoHistory={() => setScreen('history')}
          onGoProfile={() => setScreen('profile')}
          onGoSettings={() => setScreen('settings')}
          onGoHelp={() => setScreen('help')}
          onGoAbout={() => setScreen('about')}
          onGoUpgrade={() => setScreen('upgrade')}
          onLogout={handleLogout}
          onGoChat={(text?: string) => {
            handleStartNewChat(text ?? '');
          }}
        />
      ) : screen === 'login' ? (
        <LoginScreen
          onGoSignUp={() => setScreen('signup')}
          onGoForgotPassword={() => setScreen('forgot_password')}
          onLogin={handleLogin}
          onSocialLogin={handleSocialLogin}
          loading={authLoading}
        />
      ) : (
        <SignUpScreen
          onGoLogin={() => setScreen('login')}
          onSendOtp={handleSignUpSendOtp}
          onVerifyOtp={handleSignUpVerifyOtp}
          loading={authLoading}
        />
      )}
    </SafeAreaView>
  );
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getLightBg(color: AppSettings['appColor']) {
  if (color === 'Blue') return '#EAF3FF';
  if (color === 'Orange') return '#FFF2E9';
  return APP_BG_LIGHT;
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildChatHistoryHtml({
  userName,
  userEmail,
  sessions,
}: {
  userName: string;
  userEmail: string;
  sessions: ChatSession[];
}) {
  const sessionBlocks = sessions
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((session) => {
      const msgs = (session.messages || [])
        .map((m) => {
          const role = m.role === 'user' ? 'User' : 'Assistant';
          return `<p><strong>${role}:</strong> ${escapeHtml(m.text || '')}</p>`;
        })
        .join('');
      return `
        <div class="session">
          <h3>${escapeHtml(session.title || 'Untitled Chat')}</h3>
          <p class="meta">Updated: ${new Date(session.updatedAt).toLocaleString()}</p>
          ${msgs || '<p>No messages.</p>'}
        </div>
      `;
    })
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>MediCompanion Chat History</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
          h1 { margin: 0 0 8px 0; }
          .meta { color: #6b7280; font-size: 12px; }
          .session { border: 1px solid #dbe4ef; border-radius: 10px; padding: 12px; margin: 12px 0; }
          p { line-height: 1.4; margin: 8px 0; }
        </style>
      </head>
      <body>
        <h1>MediCompanion Export</h1>
        <p class="meta">User: ${escapeHtml(userName || '-')} (${escapeHtml(userEmail || '-')})</p>
        <p class="meta">Exported at: ${new Date().toLocaleString()}</p>
        ${sessionBlocks || '<p>No chat sessions found.</p>'}
      </body>
    </html>
  `;
}

function getBackTarget(current: Screen): Screen | null {
  switch (current) {
    case 'signup':
    case 'forgot_password':
      return 'login';
    case 'chat':
    case 'profile':
    case 'settings':
    case 'history':
    case 'upgrade':
      return 'home';
    case 'edit_profile':
    case 'help':
    case 'about':
    case 'disclaimer':
      return 'profile';
    case 'settings_language':
    case 'settings_text_size':
    case 'settings_manage_data':
    case 'settings_privacy_policy':
      return 'settings';
    case 'home':
    case 'login':
    case 'splash':
      return null;
    default:
      return 'home';
  }
}

function normalizeAuthUser(input: any): AuthUser {
  const id = String(input?.id || '').trim() || createUuid();
  const fullName = String(input?.fullName || '').trim() || 'MediCompanion User';
  const email = String(input?.email || '').trim();
  const photoUrl = String(input?.photoUrl || '').trim();
  return {
    id,
    fullName,
    email,
    photoUrl,
  };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
