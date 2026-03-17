import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenGradient from '../../components/ScreenGradient';
import { changePassword } from '../../services/profile/profileService';
import {
  colors,
  fontSize,
  fontWeight,
  radius,
  shadows,
  sizes,
  spacing,
} from '../../theme/tokens';

// ─── Ana ekran bileşeni ───────────────────────────────────────────────────────

export default function ChangePasswordScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  // ── Form state'leri ──────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Gönderim state'leri ──────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Submit handler ───────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError(null);
    setSuccessMessage(null);

    // Yerel validasyon
    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMessage('Şifreniz başarıyla güncellendi.');
      // Kısa bir gecikme ile geri dön — kullanıcı mesajı görsün
      setTimeout(() => {
        navigation.goBack();
      }, 1200);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Şifre değiştirilirken bir hata oluştu.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          {/* ── Form kartı ────────────────────────────────────────────────── */}
          <View style={styles.card}>

            {/* Mevcut Şifre */}
            <Text style={styles.label}>Mevcut Şifre</Text>
            <TextInput
              style={styles.input}
              placeholder="Mevcut şifrenizi girin"
              placeholderTextColor={colors.textPlaceholder}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!isSubmitting}
              autoCapitalize="none"
            />

            {/* Yeni Şifre */}
            <Text style={styles.label}>Yeni Şifre</Text>
            <TextInput
              style={styles.input}
              placeholder="Yeni şifrenizi girin"
              placeholderTextColor={colors.textPlaceholder}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!isSubmitting}
              autoCapitalize="none"
            />

            {/* Yeni Şifre Tekrar */}
            <Text style={styles.label}>Yeni Şifre Tekrar</Text>
            <TextInput
              style={styles.input}
              placeholder="Yeni şifrenizi tekrar girin"
              placeholderTextColor={colors.textPlaceholder}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isSubmitting}
              autoCapitalize="none"
            />

            {/* Hata mesajı */}
            {error !== null && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Başarı mesajı */}
            {successMessage !== null && (
              <Text style={styles.successText}>{successMessage}</Text>
            )}

            {/* Kaydet butonu */}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.surfaceCard} />
              ) : (
                <Text style={styles.submitBtnText}>Kaydet</Text>
              )}
            </TouchableOpacity>

            {/* İptal butonu */}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

// ─── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },

  // ── Form kartı ───────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing['2xl'],
    ...shadows.card,
  },

  // ── Form alanları ────────────────────────────────────────────────────────────
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colors.textOnCard,
    marginBottom: spacing.xs,
  },
  input: {
    height: sizes.inputSingleLine,
    backgroundColor: colors.surfaceAuthInput,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.body,
    color: colors.textAuthInput,
    borderWidth: 1,
    borderColor: colors.textOnDarkSecondary,
    marginBottom: spacing.lg,
  },

  // ── Mesajlar ─────────────────────────────────────────────────────────────────
  errorText: {
    fontSize: fontSize.captionError,
    color: colors.delete,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successText: {
    fontSize: fontSize.captionError,
    color: colors.done,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  // ── Butonlar ─────────────────────────────────────────────────────────────────
  submitBtn: {
    height: sizes.button,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: fontSize.buttonPrimary,
    fontWeight: fontWeight.semiBold,
    color: colors.surfaceCard,
  },
  cancelBtn: {
    height: sizes.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.textOnCardMeta,
  },
  cancelBtnText: {
    fontSize: fontSize.buttonSecondary,
    fontWeight: fontWeight.medium,
    color: colors.textOnCard,
  },
});
