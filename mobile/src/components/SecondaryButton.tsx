import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, fontSize, radius, sizes, spacing } from '../theme/tokens';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function SecondaryButton({ label, onPress, disabled = false }: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    height: sizes.button,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.actionTeal,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: fontSize.buttonSecondary,
    fontWeight: '500',
    color: colors.actionTeal,
  },
});
