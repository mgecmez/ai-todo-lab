import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSize, radius, sizes, spacing } from '../theme/tokens';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  editable?: boolean;
  returnKeyType?: 'next' | 'done' | 'go' | 'search' | 'send';
  error?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export default function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  editable = true,
  returnKeyType = 'done',
  error,
  icon,
  style,
}: FormFieldProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, multiline && styles.inputRowMultiline, error ? styles.inputRowError : null]}>
        <Ionicons
          name={icon}
          size={18}
          color={colors.textPlaceholder}
          style={[styles.icon, multiline && styles.iconTop]}
        />
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          editable={editable}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          returnKeyType={returnKeyType}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.label,
    color: colors.textOnDarkSecondary,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    height: sizes.inputSingleLine,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputRowMultiline: {
    height: sizes.descriptionInput,
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  inputRowError: {
    borderColor: colors.delete,
  },
  icon: {
    marginRight: spacing.sm,
  },
  iconTop: {
    marginTop: spacing.xs / 2,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.textOnDark,
  },
  inputMultiline: {
    height: '100%',
  },
  errorText: {
    fontSize: fontSize.captionError,
    color: colors.delete,
    marginTop: spacing.xs,
  },
});
