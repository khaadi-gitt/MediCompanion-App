import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

type Language = 'English';

export function LanguageScreen({
  value,
  onBack,
  onChange,
  profilePhotoUrl,
}: {
  value: Language;
  onBack: () => void;
  onChange: (next: Language) => void;
  profilePhotoUrl?: string;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const contentWidth = Math.min(isDesktop ? 620 : 560, width - 20);
  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 8 : 10;

  const options: Language[] = ['English'];

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <View style={[styles.content, { width: contentWidth }]}>
        <View style={styles.topRow}>
          <Pressable style={styles.topBtn} onPress={onBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#2AAFC0" />
          </Pressable>
          <Text style={styles.title}>Language</Text>
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.topBtn}>
              <MaterialCommunityIcons name="account-outline" size={22} color="#A5B2C1" />
            </View>
          )}
        </View>

        <View style={styles.card}>
          {options.map((opt) => (
            <Pressable key={opt} style={styles.optionRow} onPress={() => onChange(opt)}>
              <Text style={styles.optionText}>{opt}</Text>
              <MaterialCommunityIcons
                name={value === opt ? 'radiobox-marked' : 'radiobox-blank'}
                size={22}
                color={value === opt ? '#2AAFC0' : '#B0BDCC'}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  content: { flex: 1 },
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
  title: { fontSize: 15, color: '#2D3F56', fontWeight: '700' },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5EDF6',
    backgroundColor: '#FFFFFF',
    padding: 8,
    gap: 8,
  },
  optionRow: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E2ECF7',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: { color: '#2E3C52', fontSize: 14, fontWeight: '500' },
});
