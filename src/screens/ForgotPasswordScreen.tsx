import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Field } from '../components/Field';
import { LogoMark } from '../components/LogoMark';

export function ForgotPasswordScreen({
  onGoBack,
  onGoLogin,
  onSendOtp,
  onResetPassword,
  loading,
}: {
  onGoBack: () => void;
  onGoLogin: () => void;
  onSendOtp: (email: string) => Promise<void>;
  onResetPassword: (payload: { email: string; otp: string; newPassword: string }) => Promise<void>;
  loading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

  const { height, width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const top = isDesktop ? Math.max(18, Math.min(36, height * 0.05)) : Math.max(38, Math.min(72, height * 0.08));
  const contentWidth = Math.min(isDesktop ? 560 : 470, width - 28);

  const handleSend = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Email is required.');
      return;
    }
    setError('');
    await onSendOtp(cleanEmail);
    setOtpSent(true);
  };

  const handleReset = async () => {
    const cleanEmail = email.trim();
    const cleanOtp = otp.trim();
    if (!cleanEmail || !cleanOtp || !newPassword || !confirmPassword) {
      setError('Please fill all fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }
    setError('');
    await onResetPassword({ email: cleanEmail, otp: cleanOtp, newPassword });
  };

  return (
    <ScrollView contentContainerStyle={[styles.root, { paddingTop: top }]} keyboardShouldPersistTaps="handled">
      <View style={[styles.content, { width: contentWidth }]}> 
        <Pressable style={styles.backBtn} onPress={onGoBack}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#2AAFC0" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.topBrand}>
          <LogoMark size="login" />
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your email, get OTP, and set a new password.</Text>
        </View>

        <View style={styles.card}>
          <Field
            icon={<MaterialCommunityIcons name="email-outline" size={20} color="#A3AABB" />}
            placeholder="Email"
            secure={false}
            value={email}
            onChangeText={setEmail}
          />

          {otpSent ? (
            <>
              <Field
                icon={<MaterialCommunityIcons name="shield-key-outline" size={20} color="#A3AABB" />}
                placeholder="OTP"
                secure={false}
                value={otp}
                onChangeText={setOtp}
              />
              <Field
                icon={<MaterialCommunityIcons name="lock-outline" size={20} color="#A3AABB" />}
                placeholder="New Password"
                secure
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Field
                icon={<MaterialCommunityIcons name="lock-check-outline" size={20} color="#A3AABB" />}
                placeholder="Confirm New Password"
                secure
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!otpSent ? (
            <Pressable style={styles.sendBtn} onPress={handleSend} disabled={loading}>
              <Text style={styles.sendBtnText}>{loading ? 'Sending OTP...' : 'Send OTP'}</Text>
            </Pressable>
          ) : (
            <>
              <Pressable style={styles.sendBtn} onPress={handleReset} disabled={loading}>
                <Text style={styles.sendBtnText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
              </Pressable>
              <Pressable style={styles.resendBtn} onPress={handleSend} disabled={loading}>
                <Text style={styles.resendText}>Resend OTP</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={styles.footerText}>
          Remembered your password?{' '}
          <Text style={styles.loginLink} onPress={onGoLogin}>
            Log In
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flexGrow: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 4,
    marginBottom: 6,
  },
  backText: {
    color: '#2AAFC0',
    fontWeight: '600',
    fontSize: 13,
  },
  topBrand: {
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    marginTop: 4,
    fontSize: 22,
    color: '#2D3E54',
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    color: '#7A8495',
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#F8FCFF',
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E7EFFA',
  },
  errorText: {
    color: '#CE4F4F',
    fontSize: 12,
    marginBottom: 8,
    marginTop: -2,
    textAlign: 'left',
    paddingHorizontal: 2,
  },
  sendBtn: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: '#21B1C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  resendBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  resendText: {
    color: '#2AAFC0',
    fontWeight: '600',
    fontSize: 13,
  },
  footerText: {
    marginTop: 14,
    textAlign: 'center',
    color: '#757C8A',
    fontSize: 13,
  },
  loginLink: {
    color: '#F2875E',
    fontWeight: '600',
  },
});
