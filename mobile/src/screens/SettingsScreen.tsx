import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenGradient from '../components/ScreenGradient';
import languageService from '../services/language/languageService';
import type { SupportedLanguage } from '../services/language/languageService';
import {
  colors,
  fontSize,
  fontWeight,
  radius,
  shadows,
  spacing,
} from '../theme/tokens';
import { commonStyles } from '../theme/commonStyles';

// ─── Dil satırı tipi ─────────────────────────────────────────────────────────

interface LanguageRow {
  label: string;
  value: SupportedLanguage;
}

// ─── Ana ekran bileşeni ───────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();

  // Başlığı dil değişikliğinde güncellemek için useLayoutEffect kullanılır.
  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.screenTitle') });
  }, [navigation, t]);

  // currentLang her render'da doğrudan okunur; useState kullanılmaz.
  // Bu sayede i18n dili değiştiğinde (yeniden render tetiklendiğinde)
  // checkmark doğru dil satırında gösterilir.
  const currentLang = languageService.getCurrentLanguage();

  const languageRows: LanguageRow[] = [
    { label: t('settings.languageTurkish'), value: 'tr' },
    { label: t('settings.languageEnglish'), value: 'en' },
  ];

  function handleSelectLanguage(lang: SupportedLanguage) {
    void languageService.setLanguage(lang);
  }

  return (
    <ScreenGradient>
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={commonStyles.screenContainer}>

          {/* ── Dil bölüm başlığı ────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>
            {t('settings.sectionLanguage')}
          </Text>

          {/* ── Dil seçim kartı ──────────────────────────────────────────── */}
          <View style={styles.menuCard}>
            {languageRows.map((row, index) => (
              <View key={row.value}>
                {index > 0 && <View style={styles.separator} />}
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => handleSelectLanguage(row.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuLabel}>{row.label}</Text>
                  {currentLang === row.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>

        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

// ─── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: fontSize.metaCard,
    fontWeight: fontWeight.semiBold,
    color: colors.textOnDarkSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
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
  menuLabel: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.textOnCard,
  },
  separator: {
    height: 1,
    backgroundColor: colors.textOnDarkSecondary,
    opacity: 0.15,
    marginHorizontal: spacing.lg,
  },
});
