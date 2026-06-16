import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Field } from '../components/Field';
import { LogoMark } from '../components/LogoMark';
import { BRAND_ORANGE } from '../theme';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen({
  onGoSignUp,
  onGoForgotPassword,
  onLogin,
  onSocialLogin,
  loading,
}: {
  onGoSignUp: () => void;
  onGoForgotPassword: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onSocialLogin: (provider: 'google' | 'facebook', accessToken: string) => Promise<void>;
  loading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { height, width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const loginTop = isDesktop
    ? Math.max(22, Math.min(44, height * 0.05))
    : Math.max(42, Math.min(78, height * 0.085));
  const brandTop = isDesktop
    ? Math.max(8, Math.min(18, height * 0.02))
    : Math.max(18, Math.min(34, height * 0.035));
  const contentWidth = Math.min(isDesktop ? 560 : 470, width - 28);

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Email and password are required.');
      return;
    }

    setError('');
    await onLogin(cleanEmail, cleanPassword);
  };

  // Fallback to '_' so the hook never receives undefined clientId (which throws at render time).
  // The guard handlers below prevent promptAsync from being called with unconfigured credentials.
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const facebookAppId     = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    webClientId:     googleWebClientId     || '_',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '_',
    iosClientId:     process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     || '_',
  });

  const [, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: facebookAppId || '_',
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const token = googleResponse.authentication?.accessToken
        ?? (googleResponse as any).params?.access_token;
      if (token) onSocialLogin('google', token);
    }
  }, [googleResponse]);

  useEffect(() => {
    if (fbResponse?.type === 'success') {
      const token = (fbResponse as any).params?.access_token;
      if (token) onSocialLogin('facebook', token);
    }
  }, [fbResponse]);

  const handleGooglePress = () => {
    if (!googleWebClientId) {
      Alert.alert('Google Sign-In not configured', 'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file to enable Google login.');
      return;
    }
    googlePromptAsync();
  };

  const handleFacebookPress = () => {
    if (!facebookAppId) {
      Alert.alert('Facebook Sign-In not configured', 'Add EXPO_PUBLIC_FACEBOOK_APP_ID to your .env file to enable Facebook login.');
      return;
    }
    fbPromptAsync();
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.loginRoot, { paddingTop: loginTop }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.loginContent, { width: contentWidth }]}>
        <View style={[styles.topBrand, { marginTop: brandTop }]}>
          <LogoMark size="login" />
          <Text style={styles.tagline}>Your AI medical companion</Text>
        </View>

        <View style={styles.card}>
          <Field
            icon={<MaterialCommunityIcons name="email-outline" size={20} color="#A3AABB" />}
            placeholder="Email"
            secure={false}
            value={email}
            onChangeText={setEmail}
          />
          <Field
            icon={<MaterialCommunityIcons name="lock-outline" size={20} color="#A3AABB" />}
            rightIcon={
              <Pressable style={styles.eyeBadge} onPress={() => setShowPassword((v) => !v)}>
                <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={15} color="#FFFFFF" />
              </Pressable>
            }
            placeholder="Password"
            secure={!showPassword}
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.forgot} onPress={onGoForgotPassword}>
            Forgot password?
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={[styles.loginButton, loading && styles.disabledBtn]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Log In'}</Text>
          </Pressable>
        </View>

        <View style={styles.orRow}>
          <View style={styles.line} />
          <Text style={styles.orText}>Or continue with</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.socialRow}>
          <Pressable
            style={styles.socialBtn}
            onPress={handleGooglePress}
            disabled={loading}
          >
            <View style={styles.socialInner}>
              <View style={styles.googleIconWrap}>
                <FontAwesome name="google" size={16} color="#EA4335" />
              </View>
              <Text style={styles.socialText}>Google</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.socialBtn}
            onPress={handleFacebookPress}
            disabled={loading}
          >
            <View style={styles.socialInner}>
              <View style={styles.facebookIconWrap}>
                <FontAwesome name="facebook" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.socialText}>Facebook</Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.signupText}>
          Don’t have an account?{' '}
          <Text style={styles.signupLink} onPress={onGoSignUp}>
            Sign Up
          </Text>
        </Text>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loginRoot: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loginContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flexGrow: 1,
  },
  topBrand: {
    alignItems: 'center',
    marginBottom: 16,
  },
  tagline: {
    marginTop: 2,
    color: '#7C8190',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#F8FCFF',
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E7EFFA',
  },
  eyeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F38C84',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 10,
    color: '#4AB4C0',
    fontSize: 13,
  },
  errorText: {
    color: '#CE4F4F',
    fontSize: 12,
    marginBottom: 8,
    marginTop: -2,
    textAlign: 'left',
    paddingHorizontal: 2,
  },
  loginButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#21B1C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.65,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
  orRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#D7DEE7',
  },
  orText: {
    color: '#8A909D',
    fontSize: 13,
  },
  socialRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#DDE4EE',
    borderRadius: 23,
    justifyContent: 'center',
    backgroundColor: '#FAFCFF',
  },
  socialInner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facebookIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2E86FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: {
    color: '#4F5563',
    fontSize: 14,
    fontWeight: '500',
  },
  signupText: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 13,
    color: '#757C8A',
  },
  signupLink: {
    color: BRAND_ORANGE,
    fontWeight: '600',
  },
  terms: {
    marginTop: 'auto',
    textAlign: 'center',
    color: '#8D95A3',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 10,
  },
});
