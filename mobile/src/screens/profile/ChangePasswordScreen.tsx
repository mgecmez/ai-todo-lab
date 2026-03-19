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
import { colors, fontSize, fontWeight, spacing } from '../../theme/tokens';
import { commonStyles } from '../../theme/commonStyles';

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
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={commonStyles.screenContainer}>

          {/* ── Form kartı ────────────────────────────────────────────────── */}
          <View style={commonStyles.formCard}>

            {/* Mevcut Şifre */}
            <Text style={styles.label}>Mevcut Şifre</Text>
            <TextInput
              style={commonStyles.formInput}
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
              style={commonStyles.formInput}
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
              style={commonStyles.formInput}
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
              <Text style={commonStyles.formErrorText}>{error}</Text>
            )}

            {/* Başarı mesajı */}
            {successMessage !== null && (
              <Text style={styles.successText}>{successMessage}</Text>
            )}

            {/* Kaydet butonu */}
            <TouchableOpacity
              style={[commonStyles.primaryBtn, { marginBottom: spacing.sm }, isSubmitting && commonStyles.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.surfaceCard} />
              ) : (
                <Text style={commonStyles.primaryBtnText}>Kaydet</Text>
              )}
            </TouchableOpacity>

            {/* İptal butonu */}
            <TouchableOpacity
              style={commonStyles.outlineBtn}
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={commonStyles.outlineBtnText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

// ─── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colors.textOnCard,
    marginBottom: spacing.xs,
  },
  successText: {
    fontSize: fontSize.captionError,
    color: colors.done,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
