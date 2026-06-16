import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

type ChipTone = 'blue' | 'mint' | 'pink' | 'orange';

export function Chip({
  label,
  icon,
  tone,
  onPress,
}: {
  label: string;
  icon: string;
  tone: ChipTone;
  onPress?: () => void;
}) {
  const toneStyle =
    tone === 'blue' ? styles.chipBlue : tone === 'mint' ? styles.chipMint : tone === 'pink' ? styles.chipPink : styles.chipOrange;
  const toneTextStyle =
    tone === 'blue'
      ? styles.chipTextBlue
      : tone === 'mint'
        ? styles.chipTextMint
        : tone === 'pink'
          ? styles.chipTextPink
          : styles.chipTextOrange;

  return (
    <Pressable style={[styles.chip, toneStyle]} onPress={onPress}>
      <MaterialCommunityIcons name={icon as never} size={13} style={toneTextStyle} />
      <Text style={[styles.chipText, toneTextStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipBlue: {
    backgroundColor: '#E4F5FA',
  },
  chipMint: {
    backgroundColor: '#E9F3F2',
  },
  chipPink: {
    backgroundColor: '#FCEEEF',
  },
  chipOrange: {
    backgroundColor: '#FFF4E8',
  },
  chipTextBlue: {
    color: '#2AAEC0',
  },
  chipTextMint: {
    color: '#5F818E',
  },
  chipTextPink: {
    color: '#E27F73',
  },
  chipTextOrange: {
    color: '#D5913D',
  },
});
