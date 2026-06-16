import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Field } from '../components/Field';
import { LogoMark } from '../components/LogoMark';
import { BRAND_ORANGE } from '../theme';

export function SignUpScreen({
  onGoLogin,
  onSendOtp,
  onVerifyOtp,
  loading,
}: {
  onGoLogin: () => void;
  onSendOtp: (payload: { fullName: string; email: string; password: string; photoUrl: string }) => Promise<void>;
  onVerifyOtp: (email: string, otp: string) => Promise<void>;
  loading: boolean;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { height, width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const loginTop = isDesktop
    ? Math.max(22, Math.min(44, height * 0.05))
    : Math.max(42, Math.min(78, height * 0.085));
  const brandTop = isDesktop
    ? Math.max(8, Math.min(18, height * 0.02))
    : Math.max(18, Math.min(34, height * 0.035));
  const contentWidth = Math.min(isDesktop ? 560 : 470, width - 28);

  const chooseFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow gallery access to choose profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhotoUrl(result.assets[0].uri);
    }
  };

  const handleSendOtp = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setError('Please fill all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    setError('');
    await onSendOtp({
      fullName: cleanName,
      email: cleanEmail,
      password,
      photoUrl: photoUrl.trim(),
    });
    setOtpSent(true);
  };

  const handleVerifyOtp = async () => {
    const cleanEmail = email.trim();
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setError('Please enter the OTP from your email.');
      return;
    }
    setError('');
    await onVerifyOtp(cleanEmail, cleanOtp);
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
          <Text style={styles.tagline}>Create your MediCompanion account</Text>
        </View>

        <View style={styles.card}>
          <Field
            icon={<MaterialCommunityIcons name="account-outline" size={20} color="#A3AABB" />}
            placeholder="Full Name"
            secure={false}
            value={fullName}
            onChangeText={setFullName}
          />
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
          <Field
            icon={<MaterialCommunityIcons name="lock-check-outline" size={20} color="#A3AABB" />}
            rightIcon={
              <Pressable style={styles.eyeBadge} onPress={() => setShowConfirmPassword((v) => !v)}>
                <MaterialCommunityIcons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={15} color="#FFFFFF" />
              </Pressable>
            }
            placeholder="Confirm Password"
            secure={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <View style={styles.imageRow}>
            <Pressable style={styles.pickBtn} onPress={chooseFromGallery}>
              <MaterialCommunityIcons name="image-plus" size={16} color="#2AB0C0" />
              <Text style={styles.pickBtnText}>Choose Profile Image (Optional)</Text>
            </Pressable>
            {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.smallPreview} /> : null}
          </View>

          {otpSent ? (
            <Field
              icon={<MaterialCommunityIcons name="shield-key-outline" size={20} color="#A3AABB" />}
              placeholder="Enter 6-digit OTP"
              secure={false}
              value={otp}
              onChangeText={setOtp}
            />
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!otpSent ? (
            <Pressable style={[styles.loginButton, styles.signupButton, loading && styles.disabledBtn]} onPress={handleSendOtp} disabled={loading}>
              <Text style={styles.loginButtonText}>{loading ? 'Sending OTP...' : 'Send OTP'}</Text>
            </Pressable>
          ) : (
            <>
              <Pressable style={[styles.loginButton, styles.signupButton, loading && styles.disabledBtn]} onPress={handleVerifyOtp} disabled={loading}>
                <Text style={styles.loginButtonText}>{loading ? 'Verifying...' : 'Verify OTP & Sign Up'}</Text>
              </Pressable>
              <Pressable style={styles.resendBtn} onPress={handleSendOtp} disabled={loading}>
                <Text style={styles.resendText}>Resend OTP</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={styles.signupText}>
          Already have an account?{' '}
          <Text style={styles.signupLink} onPress={onGoLogin}>
            Log In
          </Text>
        </Text>

        <Text style={styles.terms}>
          Profile image is optional. You can add it later from Edit Profile.
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
  imageRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pickBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E8F3',
    backgroundColor: '#F4FBFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pickBtnText: {
    color: '#2AB0C0',
    fontSize: 13,
    fontWeight: '600',
  },
  smallPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9E7F2',
  },
  errorText: {
    color: '#CE4F4F',
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
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
  signupButton: {
    marginTop: 2,
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
