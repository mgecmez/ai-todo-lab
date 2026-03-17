import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
        err instanceof Error ? err.message : 'Hesap silinirken bir hata oluştu.';
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
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.textOnDark} />
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Hata durumu ──────────────────────────────────────────────────────────────
  if (isError || !profile) {
    return (
      <ScreenGradient>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.center}>
            <Text style={styles.errorText}>
              Profil bilgileri yüklenemedi.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Normal görünüm ───────────────────────────────────────────────────────────
  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

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
              <Text style={styles.menuLabel}>Email Değiştir</Text>
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
              <Text style={styles.menuLabel}>Şifre Değiştir</Text>
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
                Hesabı Sil
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
            <Text style={styles.logoutText}>Çıkış Yap</Text>
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
            <Text style={styles.modalTitle}>Hesabı Sil</Text>

            <Text style={styles.modalWarning}>
              Bu işlem geri alınamaz. Tüm verileriniz silinecektir.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Şifrenizi girin"
              placeholderTextColor={colors.textPlaceholder}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!isDeleting}
            />

            {deleteError !== null && (
              <Text style={styles.modalError}>{deleteError}</Text>
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
                <Text style={styles.modalDeleteText}>Hesabı Sil</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={handleCloseModal}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // ── State: loading / error ──────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textOnDarkSecondary,
    fontSize: fontSize.body,
  },
  errorText: {
    color: colors.delete,
    fontSize: fontSize.body,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.delete,
  },
  retryText: {
    color: colors.delete,
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
  modalError: {
    fontSize: fontSize.captionError,
    color: colors.delete,
    marginBottom: spacing.md,
    textAlign: 'center',
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
  modalCancelBtn: {
    height: sizes.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.textOnCardMeta,
  },
  modalCancelText: {
    fontSize: fontSize.buttonSecondary,
    fontWeight: fontWeight.medium,
    color: colors.textOnCard,
  },
});
