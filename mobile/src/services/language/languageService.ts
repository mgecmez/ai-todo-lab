import AsyncStorage from '@react-native-async-storage/async-storage';

import i18n from '../../i18n/i18n';
import { LANGUAGE_KEY } from '../cache/cacheKeys';

export type SupportedLanguage = 'tr' | 'en';

function detectSystemLocale(): SupportedLanguage {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

const languageService = {
  async init(): Promise<void> {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    const lang: SupportedLanguage =
      saved === 'tr' || saved === 'en' ? saved : detectSystemLocale();
    await i18n.changeLanguage(lang);
  },

  async setLanguage(lang: SupportedLanguage): Promise<void> {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  },

  getCurrentLanguage(): SupportedLanguage {
    return i18n.language === 'tr' ? 'tr' : 'en';
  },
};

export default languageService;
