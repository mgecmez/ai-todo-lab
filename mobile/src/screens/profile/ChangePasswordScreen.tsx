import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('profile.menuChangePassword') });
  }, [navigation, t]);

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
      setError(t('changePassword.errorMismatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMessage(t('changePassword.successMessage'));
      // Kısa bir gecikme ile geri dön — kullanıcı mesajı görsün
      setTimeout(() => {
        navigation.goBack();
      }, 1200);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('changePassword.errorGeneric');
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
            <Text style={styles.label}>{t('changePassword.labelCurrentPassword')}</Text>
            <TextInput
              style={commonStyles.formInput}
              placeholder={t('changePassword.placeholderCurrent')}
              placeholderTextColor={colors.textPlaceholder}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!isSubmitting}
              autoCapitalize="none"
            />

            {/* Yeni Şifre */}
            <Text style={styles.label}>{t('changePassword.labelNewPassword')}</Text>
            <TextInput
              style={commonStyles.formInput}
              placeholder={t('changePassword.placeholderNew')}
              placeholderTextColor={colors.textPlaceholder}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!isSubmitting}
              autoCapitalize="none"
            />

            {/* Yeni Şifre Tekrar */}
            <Text style={styles.label}>{t('changePassword.labelConfirmPassword')}</Text>
            <TextInput
              style={commonStyles.formInput}
              placeholder={t('changePassword.placeholderConfirm')}
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
                <Text style={commonStyles.primaryBtnText}>{t('changePassword.buttonSave')}</Text>
              )}
            </TouchableOpacity>

            {/* İptal butonu */}
            <TouchableOpacity
              style={commonStyles.outlineBtn}
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={commonStyles.outlineBtnText}>{t('changePassword.buttonCancel')}</Text>
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
