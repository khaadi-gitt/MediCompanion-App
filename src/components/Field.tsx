import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

export function Field({
  icon,
  rightIcon,
  placeholder,
  secure,
  value,
  onChangeText,
}: {
  icon: ReactNode;
  rightIcon?: ReactNode;
  placeholder: string;
  secure: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldIconWrap}>{icon}</View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA0AC"
        secureTextEntry={secure}
        style={styles.input}
      />
      {rightIcon ? <View style={styles.fieldRightIconWrap}>{rightIcon}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D6E5F5',
    borderRadius: 25,
    backgroundColor: '#FBFDFF',
    paddingHorizontal: 10,
    height: 50,
    marginBottom: 10,
  },
  fieldIconWrap: {
    width: 24,
    alignItems: 'center',
    marginRight: 5,
  },
  input: {
    flex: 1,
    color: '#2B2F38',
    fontSize: 15,
  },
  fieldRightIconWrap: {
    marginLeft: 8,
  },
});
