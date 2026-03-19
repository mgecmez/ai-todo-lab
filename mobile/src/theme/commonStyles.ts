import { StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, radius, shadows, sizes, spacing } from './tokens';

/**
 * Birden fazla ekranda kullanılan ortak stil tanımları.
 * Ekrana özel stiller ilgili ekranın kendi StyleSheet'inde kalır.
 */
export const commonStyles = StyleSheet.create({

  // ── Ekran layout ──────────────────────────────────────────────────────────

  safeArea: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },

  // ── Yükleme / hata durumu ─────────────────────────────────────────────────

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  screenErrorText: {
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

  // ── Form kartı ────────────────────────────────────────────────────────────

  formCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing['2xl'],
    ...shadows.card,
  },
  formInput: {
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
  formErrorText: {
    fontSize: fontSize.captionError,
    color: colors.delete,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  // ── Birincil (dolu) buton ─────────────────────────────────────────────────

  primaryBtn: {
    height: sizes.button,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: fontSize.buttonPrimary,
    fontWeight: fontWeight.semiBold,
    color: colors.surfaceCard,
  },

  // ── İkincil (kenarlıklı) buton ────────────────────────────────────────────

  outlineBtn: {
    height: sizes.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.textOnCardMeta,
  },
  outlineBtnText: {
    fontSize: fontSize.buttonSecondary,
    fontWeight: fontWeight.medium,
    color: colors.textOnCard,
  },

  // ── Auth ekranları (Login + Register) ─────────────────────────────────────

  authFlex: { flex: 1 },
  authContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg + spacing.sm,
    paddingTop: 60,
    paddingBottom: spacing['3xl'] + spacing.sm,
    alignItems: 'center',
  },
  authLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  authTitle: {
    fontSize: 25,
    fontWeight: fontWeight.medium,
    color: colors.textOnDark,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  authSubtitle: {
    fontSize: fontSize.buttonPrimary + 3,
    fontWeight: fontWeight.medium,
    color: colors.textOnDark,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  authInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAuthInput,
    borderRadius: 5,
    height: 44,
    width: '100%',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  authInputError: {
    borderColor: colors.delete,
  },
  authInputIcon: {
    marginRight: spacing.sm,
  },
  authInput: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.textAuthInput,
  },
  authErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.delete,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    width: '100%',
    gap: 6,
  },
  authErrorText: {
    flex: 1,
    fontSize: fontSize.captionError,
    color: colors.delete,
  },
  authButton: {
    width: '100%',
    height: 44,
    backgroundColor: colors.authButtonBg,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: fontWeight.semiBold,
    color: colors.textOnDark,
  },
  authLinkContainer: {
    flexDirection: 'row',
    minHeight: 44,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  authLinkMuted: {
    fontSize: fontSize.body,
    color: colors.textAuthLinkMuted,
  },
  authLinkAccent: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
    color: colors.textAuthLink,
  },
});
