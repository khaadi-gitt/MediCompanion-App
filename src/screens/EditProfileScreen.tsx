import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

export type ProfilePayload = {
  fullName: string;
  email: string;
  photoUrl: string;
  photoDataUrl?: string;
};

export function EditProfileScreen({
  profile,
  onBack,
  onSave,
}: {
  profile: ProfilePayload;
  onBack: () => void;
  onSave: (next: ProfilePayload) => void;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const contentWidth = Math.min(isDesktop ? 560 : 470, width - 28);
  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 8 : 10;

  const [name, setName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [photo, setPhoto] = useState(profile.photoUrl);
  const [photoDataUrl, setPhotoDataUrl] = useState(profile.photoDataUrl || '');

  const pickImage = async () => {
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
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset: any = result.assets[0];
      setPhoto(String(asset?.uri || ''));
      const rawB64 = String(asset?.base64 || '').trim();
      if (rawB64) {
        setPhotoDataUrl(`data:image/jpeg;base64,${rawB64}`);
      } else {
        setPhotoDataUrl('');
      }
    }
  };

  return (
    <View style={[styles.root, { paddingTop: topInset }]}> 
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, { width: contentWidth }]}> 
          <View style={styles.topRow}>
            <Pressable style={styles.topBtn} onPress={onBack}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#2AAFC0" />
            </Pressable>
            <Text style={styles.title}>Edit Profile</Text>
            <View style={styles.topBtn} />
          </View>

          <View style={styles.avatarWrap}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialCommunityIcons name="account" size={42} color="#7FA4B2" />
              </View>
            )}
          </View>

          <View style={styles.card}>
            <InputRow icon="account-outline" value={name} onChangeText={setName} placeholder="Full Name" />
            <InputRow icon="email-outline" value={email} onChangeText={setEmail} placeholder="Email" />
            <InputRow
              icon="image-outline"
              value={photo}
              onChangeText={(v) => {
                setPhoto(v);
                setPhotoDataUrl('');
              }}
              placeholder="Image URL (Optional)"
            />

            <Pressable style={styles.pickBtn} onPress={pickImage}>
              <MaterialCommunityIcons name="image-plus" size={17} color="#2AB0C0" />
              <Text style={styles.pickText}>Choose from Gallery</Text>
            </Pressable>

            <Pressable
              style={styles.saveBtn}
              onPress={() =>
                onSave({
                  fullName: name.trim() || 'User',
                  email: email.trim(),
                  photoUrl: photo.trim(),
                  photoDataUrl: photoDataUrl.trim(),
                })
              }
            >
              <Text style={styles.saveText}>Save Profile</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InputRow({
  icon,
  value,
  onChangeText,
  placeholder,
}: {
  icon: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.inputRow}>
      <MaterialCommunityIcons name={icon as never} size={18} color="#9AA8B8" />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  content: { alignSelf: 'center', width: '100%' },
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
  avatarWrap: { alignItems: 'center', marginBottom: 10 },
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5EDF6',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
  },
  inputRow: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E2ECF7',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, color: '#334862', fontSize: 13 },
  pickBtn: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E8F3',
    backgroundColor: '#F4FBFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pickText: { color: '#2AB0C0', fontSize: 13, fontWeight: '600' },
  saveBtn: {
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: '#23B0C1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
