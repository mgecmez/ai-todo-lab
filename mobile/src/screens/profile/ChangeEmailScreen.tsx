import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
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
import { useAuth } from '../../context/AuthContext';
import { changeEmail } from '../../services/profile/profileService';
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

export default function ChangeEmailScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { updateEmail } = useAuth();
  const queryClient = useQueryClient();

  // ── Form state'leri ──────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Submit handler ───────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!currentPassword || !newEmail) return;

    setIsLoading(true);
    setError(null);

    try {
      await changeEmail(currentPassword, newEmail);
      await updateEmail(newEmail);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigation.goBack();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'E-posta değiştirilirken bir hata oluştu.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          {/* ── Form kartı ────────────────────────────────────────────────── */}
          <View style={styles.card}>

            {/* Yeni E-posta */}
            <Text style={styles.label}>Yeni E-posta</Text>
            <TextInput
              style={styles.input}
              placeholder="Yeni e-posta adresiniz"
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="email-address"
              value={newEmail}
              onChangeText={setNewEmail}
              editable={!isLoading}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Mevcut Şifre */}
            <Text style={styles.label}>Mevcut Şifre</Text>
            <TextInput
              style={styles.input}
              placeholder="Değişikliği onaylamak için şifrenizi girin"
              placeholderTextColor={colors.textPlaceholder}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!isLoading}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Hata mesajı */}
            {error !== null && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Kaydet butonu */}
            <TouchableOpacity
              style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.surfaceCard} />
              ) : (
                <Text style={styles.saveBtnText}>Kaydet</Text>
              )}
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
    marginBottom: spacing.sm,
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

  // ── Hata mesajı ──────────────────────────────────────────────────────────────
  errorText: {
    fontSize: fontSize.captionError,
    color: colors.delete,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  // ── Kaydet butonu ────────────────────────────────────────────────────────────
  saveBtn: {
    height: sizes.button,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: fontSize.buttonPrimary,
    fontWeight: fontWeight.semiBold,
    color: colors.surfaceCard,
  },
});
