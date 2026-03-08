import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, fontSize, radius, sizes, spacing } from '../theme/tokens';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function PrimaryButton({ label, onPress, loading = false, disabled = false }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, (loading || disabled) && styles.btnDisabled]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={colors.textOnDark} size="small" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    height: sizes.button,
    borderRadius: radius.sm,
    backgroundColor: colors.actionCreate,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  label: {
    fontSize: fontSize.buttonPrimary,
    fontWeight: '600',
    color: colors.textOnDark,
  },
});
