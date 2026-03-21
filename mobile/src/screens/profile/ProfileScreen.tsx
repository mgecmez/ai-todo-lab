import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenGradient from '../../components/ScreenGradient';
import { useAuth } from '../../context/AuthContext';
import {
  deleteAccount,
  getProfile,
} from '../../services/profile/profileService';
import {
  colors,
  fontSize,
  fontWeight,
  radius,
  shadows,
  sizes,
  spacing,
} from '../../theme/tokens';
import { commonStyles } from '../../theme/commonStyles';

// ─── Yardımcı: createdAt tarihini Türkçe formata çevirir ─────────────────────

function formatDateTR(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Ana ekran bileşeni ───────────────────────────────────────────────────────

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { logout } = useAuth();
  const { t } = useTranslation();

  // ── Profil verisi — TanStack Query ile ──────────────────────────────────────
  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  // ── Hesap silme modal state'i ────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Hesap silme işlemi ───────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    if (!currentPassword) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount(currentPassword);
      setModalVisible(false);
      await logout();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('profile.errorDeleteGeneric');
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Modal kapatma ────────────────────────────────────────────────────────────
  function handleCloseModal() {
    setModalVisible(false);
    setCurrentPassword('');
    setDeleteError(null);
  }

  // ── Yükleme durumu ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={commonStyles.safeArea}>
          <View style={commonStyles.center}>
            <ActivityIndicator size="large" color={colors.textOnDark} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Hata durumu ──────────────────────────────────────────────────────────────
  if (isError || !profile) {
    return (
      <ScreenGradient>
        <SafeAreaView style={commonStyles.safeArea}>
          <View style={commonStyles.center}>
            <Text style={commonStyles.screenErrorText}>
              {t('profile.errorLoad')}
            </Text>
            <TouchableOpacity style={commonStyles.retryBtn} onPress={() => refetch()}>
              <Text style={commonStyles.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Normal görünüm ───────────────────────────────────────────────────────────
  return (
    <ScreenGradient>
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={commonStyles.screenContainer}>

          {/* ── Profil bilgisi satırı ─────────────────────────────────────── */}
          <View style={styles.profileRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-circle-outline" size={28} color={colors.textOnDark} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {profile.email}
              </Text>
              <Text style={styles.profileDate}>
                {formatDateTR(profile.createdAt)}
              </Text>
            </View>
          </View>

          {/* ── Menü listesi ──────────────────────────────────────────────── */}
          <View style={styles.menuCard}>

            {/* Email Değiştir */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('ChangeEmail')}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={20} color={colors.textOnCard} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>{t('profile.menuChangeEmail')}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            {/* Şifre Değiştir */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('ChangePassword')}
              activeOpacity={0.7}
            >
              <Ionicons name="lock-closed-outline" size={20} color={colors.textOnCard} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>{t('profile.menuChangePassword')}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            {/* Ayarlar */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={20} color={colors.textOnCard} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>{t('profile.menuSettings')}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            {/* Hesabı Sil */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={colors.delete} style={styles.menuIcon} />
              <Text style={[styles.menuLabel, styles.menuLabelDanger]}>
                {t('profile.menuDeleteAccount')}
              </Text>
              <Text style={[styles.menuChevron, styles.menuChevronDanger]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* ── Çıkış Yap butonu ──────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => logout()}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.delete} />
            <Text style={styles.logoutText}>{t('profile.buttonLogout')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Hesap Silme Modal ────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('profile.deleteModalTitle')}</Text>

            <Text style={styles.modalWarning}>
              {t('profile.deleteModalWarning')}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder={t('profile.deleteModalPlaceholder')}
              placeholderTextColor={colors.textPlaceholder}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!isDeleting}
            />

            {deleteError !== null && (
              <Text style={commonStyles.formErrorText}>{deleteError}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.modalDeleteBtn,
                isDeleting && styles.modalBtnDisabled,
              ]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.8}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.surfaceCard} />
              ) : (
                <Text style={styles.modalDeleteText}>{t('profile.deleteModalButton')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={commonStyles.outlineBtn}
              onPress={handleCloseModal}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={commonStyles.outlineBtnText}>{t('profile.deleteModalCancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenGradient>
  );
}

// ─── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── State: loading ──────────────────────────────────────────────────────────
  loadingText: {
    color: colors.textOnDarkSecondary,
    fontSize: fontSize.body,
  },

  // ── Profil satırı ───────────────────────────────────────────────────────────
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    paddingHorizontal: spacing.sm,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceInput,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  iconText: {
    fontSize: 24,
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    fontSize: fontSize.taskTitleCard,
    fontWeight: fontWeight.semiBold,
    color: colors.textOnDark,
    marginBottom: spacing.xs,
  },
  profileDate: {
    fontSize: fontSize.metaCard,
    color: colors.textOnDarkSecondary,
  },

  // ── Menü kartı ──────────────────────────────────────────────────────────────
  menuCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    ...shadows.card,
    marginBottom: spacing['3xl'],
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  menuIcon: {
    marginRight: spacing.md,
    width: 28,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.textOnCard,
  },
  menuLabelDanger: {
    color: colors.delete,
  },
  menuChevron: {
    fontSize: 22,
    color: colors.textOnCardMeta,
    lineHeight: 26,
  },
  menuChevronDanger: {
    color: colors.delete,
  },
  separator: {
    height: 1,
    backgroundColor: colors.textOnDarkSecondary,
    opacity: 0.15,
    marginHorizontal: spacing.lg,
  },

  // ── Çıkış butonu ────────────────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.full,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.md,
    minHeight: sizes.button,
    gap: spacing.sm,
    ...shadows.card,
  },
  logoutText: {
    fontSize: fontSize.buttonPrimary,
    fontWeight: fontWeight.semiBold,
    color: colors.delete,
  },

  // ── Modal ────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing['2xl'],
    width: '100%',
    ...shadows.sheet,
  },
  modalTitle: {
    fontSize: fontSize.screenTitle,
    fontWeight: fontWeight.bold,
    color: colors.textOnCard,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalWarning: {
    fontSize: fontSize.body,
    color: colors.textOnCardMeta,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 22,
  },
  modalInput: {
    height: sizes.inputSingleLine,
    backgroundColor: colors.surfaceAuthInput,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.body,
    color: colors.textAuthInput,
    borderWidth: 1,
    borderColor: colors.textOnDarkSecondary,
    marginBottom: spacing.md,
  },
  modalDeleteBtn: {
    height: sizes.button,
    backgroundColor: colors.delete,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  modalBtnDisabled: {
    opacity: 0.6,
  },
  modalDeleteText: {
    fontSize: fontSize.buttonPrimary,
    fontWeight: fontWeight.semiBold,
    color: colors.surfaceCard,
  },
});
