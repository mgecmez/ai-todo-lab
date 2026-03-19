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
import { colors, fontSize, fontWeight, spacing } from '../../theme/tokens';
import { commonStyles } from '../../theme/commonStyles';

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
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={commonStyles.screenContainer}>

          {/* ── Form kartı ────────────────────────────────────────────────── */}
          <View style={commonStyles.formCard}>

            {/* Yeni E-posta */}
            <Text style={styles.label}>Yeni E-posta</Text>
            <TextInput
              style={commonStyles.formInput}
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
              style={commonStyles.formInput}
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
              <Text style={commonStyles.formErrorText}>{error}</Text>
            )}

            {/* Kaydet butonu */}
            <TouchableOpacity
              style={[commonStyles.primaryBtn, { marginTop: spacing.sm }, isLoading && commonStyles.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.surfaceCard} />
              ) : (
                <Text style={commonStyles.primaryBtnText}>Kaydet</Text>
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
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colors.textOnCard,
    marginBottom: spacing.sm,
  },
});
