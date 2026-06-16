import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

export function NavItem({
  label,
  icon,
  active,
  accent,
  onPress,
}: {
  label: string;
  icon: string;
  active?: boolean;
  accent?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      <MaterialCommunityIcons
        name={icon as never}
        size={22}
        color={active ? '#24AABA' : accent ? '#F19A64' : '#B0B7C4'}
      />
      <Text style={[styles.navLabel, active ? styles.navLabelActive : accent ? styles.navLabelAccent : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
  },
  navLabel: {
    marginTop: 3,
    color: '#AEB6C3',
    fontSize: 11,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#24AABA',
  },
  navLabelAccent: {
    color: '#F19A64',
  },
});
