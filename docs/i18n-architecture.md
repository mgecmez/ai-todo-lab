# i18n Architecture — BL-044

Feature: Çoklu Dil Desteği (Multi-language Support)
Version: 1.0
Date: 2026-03-21
Author: Architect Agent
Target Release: v1.0.0 — Sprint 1
Status: Approved

---

## 1. Overview

Bu doküman BL-044 i18n özelliğinin teknik tasarımını tanımlar. Mevcut mimariyle uyumlu kararlar ve
implementasyon rehberi içerir. Backend'e hiçbir değişiklik yapılmaz; bu tamamen frontend-only bir
değişikliktir.

### Desteklenen Diller

| Kod | Dil      | Varsayılan mı?                       |
|-----|----------|--------------------------------------|
| tr  | Türkçe   | Sistem lokali `tr` ise evet          |
| en  | İngilizce | Sistem lokali `tr` değilse varsayılan |

---

## 2. Paket Kararı

### 2.1 Seçilen Paketler

| Paket | Versiyon | Gerekçe |
|-------|----------|---------|
| `i18next` | `^23.15.2` | i18next v24+ React 18 concurrent mode bağımlılığı getirir; v23 React 19 ile stabil çalışır |
| `react-i18next` | `^14.1.3` | react-i18next v15 React 19 gerektirir; v14 serisinin son versiyonu Expo SDK 55 + React 19.2 ile uyumludur |

> **Neden v23 / v14?** Expo SDK 55 + React 19.2.0 ortamında i18next v24 ve react-i18next v15'in
> peer dependency talepleri uyumsuzluk çıkarabilir. v23/v14 LTS çifti stabil ve production-ready
> olup bu kısıtı ortadan kaldırır.

### 2.2 Kurulum Komutu

```bash
cd mobile
npx expo install i18next@^23.15.2 react-i18next@^14.1.3
```

> `npx expo install` komutu SDK uyumluluğunu kontrol eder. Çıktıda uyumsuzluk uyarısı yoksa
> versiyon sabitlemesi doğru demektir. Uyarı çıkarsa `package.json`'da pin'lenen versiyonlar
> yukarıdaki değerlere manuel olarak set edilecektir.

### 2.3 expo-localization Kararı

`expo-localization` projede **mevcut değildir** ve bu sprint için ek bağımlılık olarak eklenmeyecektir.
Sistem lokali tespiti `NativeModules` veya `Intl` global API aracılığıyla yapılacaktır (bkz. §5.2).

---

## 3. Dosya Yapısı

```
mobile/src/i18n/
├── i18n.ts                  # i18next init + dil yükleme mantığı
├── react-i18next.d.ts       # TypeScript tip genişletmesi (DefaultResources)
└── locales/
    ├── tr.json              # Türkçe çeviriler (kaynak dil)
    └── en.json              # İngilizce çeviriler (aynı anahtar seti)
```

Yeni servis dosyası:

```
mobile/src/services/language/
└── languageService.ts       # AsyncStorage okuma/yazma + dil uygulama
```

---

## 4. i18n.ts — Başlatma Kodu

Init stratejisi: **Synchronous side-effect import**. `App.tsx` içinde `import './src/i18n/i18n'`
satırı tüm component ağacı mount edilmeden önce i18next'i yapılandırır. Suspense veya async init
gerektirmez; bundle'a dahil edilen JSON dosyaları ile anında hazır hale gelir.

```typescript
// mobile/src/i18n/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import tr from './locales/tr.json';
import en from './locales/en.json';

// Sistem lokali tespiti — expo-localization gerektirmez
function detectSystemLocale(): string {
  try {
    // React Native ortamında Intl.DateTimeFormat().resolvedOptions().locale güvenilirdir
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    lng: detectSystemLocale(),   // languageService başlatıldığında override edilir
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,        // React zaten XSS koruması yapar
    },
    compatibilityJSON: 'v4',     // i18next v23 varsayılanı; ileride v4 formatı için hazır
  });

export default i18n;
```

**Önemli:** `lng` burada sadece geçici bir başlangıç değeridir. `languageService.init()` çağrısı
AsyncStorage'ı okuyarak gerçek dili uygular (bkz. §5).

---

## 5. Dil Kalıcılığı — languageService.ts

```typescript
// mobile/src/services/language/languageService.ts
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
  /**
   * Uygulama başlangıcında çağrılır.
   * Önce AsyncStorage'ı kontrol eder, yoksa sistem lokalini kullanır.
   */
  async init(): Promise<void> {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    const lang: SupportedLanguage =
      saved === 'tr' || saved === 'en' ? saved : detectSystemLocale();
    await i18n.changeLanguage(lang);
  },

  /**
   * Kullanıcı dili değiştirdiğinde çağrılır.
   * AsyncStorage'a yazar ve i18next'i anında günceller.
   */
  async setLanguage(lang: SupportedLanguage): Promise<void> {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  },

  getCurrentLanguage(): SupportedLanguage {
    return (i18n.language === 'tr' ? 'tr' : 'en') as SupportedLanguage;
  },
};

export default languageService;
```

### 5.1 Başlatma Sırası (App.tsx)

```
App.tsx import listesi
  ├── import './src/i18n/i18n'          ← 1. sync init (sistem lokali ile)
  ├── import ... AuthProvider           ← 2. diğer importlar
  └── ...

App() component mount:
  useEffect(() => {
    setupNetInfoSync();
    void notificationService.initialize();
    void languageService.init();         ← 3. AsyncStorage override (async)
  }, []);
```

`languageService.init()` tamamlandığında `i18n.changeLanguage()` tetiklenir ve React bileşenleri
yeniden render edilir. Bu kısa gecikme (AsyncStorage okuma ~10ms) pratikte kullanıcı tarafından
fark edilmez; ancak uygulama açılırken bir frame'de sistem lokali, ardından kayıtlı tercih görünür.

### 5.2 Sistem Lokali Algılama Yöntemi

`Intl.DateTimeFormat().resolvedOptions().locale` JSC ve Hermes engine'lerde güvenilirdir.
Expo SDK 55 + React Native 0.83.2 Hermes varsayılan engine'i kullandığından bu API çalışır.
Fallback olarak `'en'` döndürülür; herhangi bir native module bridge çağrısı gerekmez.

---

## 6. cacheKeys.ts Değişikliği

`mobile/src/services/cache/` klasöründe bir `cacheKeys.ts` dosyası şu an **mevcut değildir** (dosya
bulunamadı). Frontend Developer bu dosyayı yeni oluşturacak veya varsa konumunu doğrulayacaktır.
Dil anahtarı aşağıdaki konvansiyonla tanımlanacaktır:

```typescript
// mobile/src/services/cache/cacheKeys.ts  (varsa mevcut dosyaya eklenir)
export const LANGUAGE_KEY = '@app:language';

// Mevcut cache key'leri varsa burada toplanır:
// export const TODOS_CACHE_KEY = '@app:todos';
// export const AUTH_TOKEN_KEY  = '@app:auth_token';
```

Anahtar formatı `@app:<name>` convention'ına uygundur (spec'te `@app:language` olarak belirtilmiş).

---

## 7. TypeScript Tip Tanımı

```typescript
// mobile/src/i18n/react-i18next.d.ts
import type tr from './locales/tr.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof tr;
    };
  }
}
```

Bu tanım sayesinde `t('common.save')` gibi çağrılar TypeScript tarafından denetlenir; `tr.json`'da
bulunmayan anahtar derleme hatası verir. `typeof tr` pattern'i `DefaultResources` yaklaşımının
i18next v23 için standart karşılığıdır.

**Kural:** `tr.json` kaynak dil (source of truth) dosyasıdır. `en.json` aynı anahtar yapısını
içermek zorundadır; eksik anahtar CI'da `tsc --noEmit` ile tespit edilir.

---

## 8. Çeviri Dosyası Yapısı (JSON Shape)

```json
// locales/tr.json — temsili yapı
{
  "common": {
    "loading": "Yükleniyor...",
    "error": "Hata oluştu",
    "retry": "Tekrar Dene",
    "save": "Kaydet",
    "cancel": "İptal",
    "delete": "Sil",
    "edit": "Düzenle",
    "ok": "Tamam"
  },
  "todoList": {
    "screenTitle": "Görevlerim",
    "emptyState": "Henüz görev yok",
    "noSearchResult": "Sonuç bulunamadı",
    "deleteTitle": "Görevi Sil",
    "deleteMessage": "Bu görevi silmek istediğinize emin misiniz?",
    "pendingLabel": "Bekliyor"
  },
  "todoForm": {
    "titleCreate": "Yeni Görev",
    "titleEdit": "Görevi Düzenle",
    "fieldTitle": "Başlık",
    "fieldDescription": "Açıklama",
    "fieldPriority": "Öncelik",
    "fieldDueDate": "Son Tarih",
    "fieldAllDay": "Tüm Gün",
    "fieldReminder": "Hatırlatıcı",
    "placeholderTitle": "Görev başlığı girin...",
    "validationTitleRequired": "Başlık zorunludur",
    "pastDateTitle": "Geçmiş Tarih",
    "pastDateMessage": "Seçilen tarih geçmişte. Devam etmek istiyor musunuz?",
    "buttonSave": "Kaydet",
    "buttonUpdate": "Güncelle",
    "priority": {
      "low": "Düşük",
      "normal": "Normal",
      "high": "Yüksek",
      "urgent": "Acil"
    },
    "reminder": {
      "none": "Yok",
      "5min": "5 dakika önce",
      "15min": "15 dakika önce",
      "30min": "30 dakika önce",
      "1hour": "1 saat önce",
      "1day": "1 gün önce"
    }
  },
  "taskDetail": {
    "pendingBanner": "Bekliyor",
    "statusCompleted": "Tamamlandı",
    "statusInProgress": "Devam Ediyor",
    "pinned": "Sabitlendi",
    "noDescription": "Açıklama yok",
    "actionEdit": "Düzenle",
    "actionComplete": "Tamamla",
    "actionUndo": "Geri Al",
    "actionPin": "Sabitle",
    "actionDelete": "Sil",
    "deleteTitle": "Görevi Sil",
    "deleteMessage": "Bu görevi silmek istediğinize emin misiniz?"
  },
  "login": {
    "title": "Giriş Yap",
    "subtitle": "Hesabınıza giriş yapın",
    "placeholderEmail": "E-posta",
    "placeholderPassword": "Şifre",
    "buttonLogin": "Giriş Yap",
    "linkNoAccount": "Hesabınız yok mu?",
    "linkRegister": "Kayıt Ol",
    "errorGeneric": "Giriş başarısız. Bilgilerinizi kontrol edin."
  },
  "register": {
    "title": "Kayıt Ol",
    "subtitle": "Yeni hesap oluşturun",
    "placeholderEmail": "E-posta",
    "placeholderPassword": "Şifre",
    "placeholderPasswordConfirm": "Şifre Tekrar",
    "buttonRegister": "Kayıt Ol",
    "linkHasAccount": "Zaten hesabınız var mı?",
    "linkLogin": "Giriş Yap",
    "errorPasswordMismatch": "Şifreler eşleşmiyor",
    "errorGeneric": "Kayıt başarısız. Lütfen tekrar deneyin."
  },
  "profile": {
    "menuChangeEmail": "Email Değiştir",
    "menuChangePassword": "Şifre Değiştir",
    "menuSettings": "Ayarlar",
    "menuDeleteAccount": "Hesabı Sil",
    "buttonLogout": "Çıkış Yap",
    "errorLoad": "Profil yüklenemedi",
    "deleteModalTitle": "Hesabı Sil",
    "deleteModalWarning": "Bu işlem geri alınamaz. Tüm verileriniz silinecek.",
    "deleteModalPlaceholder": "Silmek için şifrenizi girin",
    "deleteModalButton": "Hesabı Kalıcı Olarak Sil",
    "deleteModalCancel": "İptal",
    "errorDeleteGeneric": "Hesap silinemedi. Lütfen tekrar deneyin."
  },
  "changeEmail": {
    "labelNewEmail": "Yeni E-posta",
    "labelCurrentPassword": "Mevcut Şifre",
    "placeholderNewEmail": "Yeni e-posta adresiniz",
    "placeholderPassword": "Mevcut şifreniz",
    "buttonSave": "Kaydet",
    "errorGeneric": "E-posta değiştirilemedi. Lütfen tekrar deneyin."
  },
  "changePassword": {
    "labelCurrentPassword": "Mevcut Şifre",
    "labelNewPassword": "Yeni Şifre",
    "labelConfirmPassword": "Yeni Şifre Tekrar",
    "placeholderCurrent": "Mevcut şifreniz",
    "placeholderNew": "Yeni şifreniz",
    "placeholderConfirm": "Yeni şifrenizi tekrarlayın",
    "buttonSave": "Kaydet",
    "buttonCancel": "İptal",
    "errorMismatch": "Yeni şifreler eşleşmiyor",
    "errorGeneric": "Şifre değiştirilemedi. Lütfen tekrar deneyin.",
    "successMessage": "Şifreniz başarıyla değiştirildi"
  },
  "settings": {
    "screenTitle": "Ayarlar",
    "sectionLanguage": "DİL / LANGUAGE",
    "languageTurkish": "Türkçe",
    "languageEnglish": "English"
  },
  "searchBar": {
    "placeholder": "Görev ara..."
  },
  "dateTimePicker": {
    "cancel": "İptal",
    "confirm": "Tamam",
    "titleDate": "Tarih Seç",
    "titleTime": "Saat Seç"
  }
}
```

`en.json` birebir aynı anahtar yapısını taşır; yalnızca değerler İngilizce olur.

---

## 9. Navigation Başlık Entegrasyonu

AppNavigator'daki `options={{ title: '...' }}` static string'leri kaldırılır. Her ekran kendi
başlığını `useLayoutEffect` ile `navigation.setOptions()` üzerinden set eder. Bu yaklaşım dil
değişikliğinde re-render tetiklediğinde başlıkların otomatik güncellenmesini sağlar.

### 9.1 Ekran İçi Pattern

```typescript
// Her screen component içinde kullanılacak standart pattern
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

function TodoListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('todoList.screenTitle') });
  }, [navigation, t]);

  // ...
}
```

`t` fonksiyonu dil değiştiğinde yeni bir referans alır; bu `useLayoutEffect`'in dependency
array'ini tetikler ve başlık güncellenir.

### 9.2 AppNavigator Değişikliği

`AppNavigator.tsx` içindeki tüm `options={{ title: '...' }}` static string'leri boş bırakılır
ya da silinir. Her screen kendi başlığından sorumlu olacaktır:

```typescript
// AppNavigator.tsx — ÖNCE
<Stack.Screen name="TodoList" component={TodoListScreen} options={{ title: 'Görevlerim' }} />

// AppNavigator.tsx — SONRA
<Stack.Screen name="TodoList" component={TodoListScreen} />
// (başlık TodoListScreen içinde useLayoutEffect ile set edilir)
```

**Alternatif (kabul edilmez):** `AppNavigator`'da `useTranslation()` çağrısı yapıp tüm title'ları
orada yönetmek; bu antipattern'dir çünkü Navigator dil değişiminde otomatik yeniden render olmaz.

---

## 10. SettingsScreen — Veri Akışı

### 10.1 navigation/types.ts Değişikliği

`AppStackParamList`'e `Settings` rotası eklenir:

```typescript
// mobile/src/navigation/types.ts — EKLENEN
export type AppStackParamList = {
  TodoList: undefined;
  TodoForm: { mode: 'create' } | { mode: 'edit'; todo: Todo };
  TaskDetail: { todo: Todo };
  Profile: undefined;
  ChangeEmail: undefined;
  ChangePassword: undefined;
  Settings: undefined;             // <-- YENİ
};

// Yeni prop type
export type SettingsScreenProps = NativeStackScreenProps<AppStackParamList, 'Settings'>;
```

### 10.2 SettingsScreen Veri Akışı

```
Kullanıcı dil seçeneğine tıklar
        │
        ▼
SettingsScreen.handleLanguageSelect(lang: SupportedLanguage)
        │
        ▼
languageService.setLanguage(lang)
    ├── AsyncStorage.setItem(LANGUAGE_KEY, lang)   ← kalıcılık
    └── i18n.changeLanguage(lang)                  ← anında güncelleme
              │
              ▼
    react-i18next tüm useTranslation() hook'larını
    kullanan component'leri yeniden render eder
              │
              ┌──────────────────────────────────────┐
              │  Tüm aktif ekranlar re-render olur:  │
              │  - SettingsScreen (başlık + seçenekler)│
              │  - ProfileScreen (menü başlıkları)   │
              │  - TodoListScreen (eğer stack'teyse) │
              └──────────────────────────────────────┘
```

### 10.3 SettingsScreen Component Taslağı

Frontend Developer aşağıdaki API'ye göre implementasyon yapacaktır:

```typescript
// mobile/src/screens/SettingsScreen.tsx
import { useTranslation } from 'react-i18next';
import languageService, { SupportedLanguage } from '../services/language/languageService';

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { t } = useTranslation();
  const currentLang = languageService.getCurrentLanguage();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.screenTitle') });
  }, [navigation, t]);

  const handleSelect = async (lang: SupportedLanguage) => {
    await languageService.setLanguage(lang);
    // Ekrana ait lokal state güncelleme gerekmez;
    // i18n değişikliği otomatik re-render tetikler.
  };

  // UI: iki satır liste (Türkçe / English), aktif olan checkmark ile işaretli
  // Stil: ProfileScreen gradient + kart yapısı ile tutarlı (design-system.md)
}
```

### 10.4 ProfileScreen Navigasyon Girişi

`ProfileScreen`'deki mevcut menü listesine "Ayarlar" girişi eklenir:

```typescript
// ProfileScreen içinde — mevcut ChangeEmail / ChangePassword satırlarından sonra
<MenuItem
  label={t('profile.menuSettings')}
  onPress={() => navigation.navigate('Settings')}
/>
```

---

## 11. App.tsx Değişiklikleri

```typescript
// App.tsx — EKLENECEK SATIRLAR

// 1. i18n side-effect import (ilk import satırlarına, diğer tüm importlardan ÖNCE)
import './src/i18n/i18n';

// 2. languageService import
import languageService from './src/services/language/languageService';

// 3. useEffect içine ekleme
useEffect(() => {
  setupNetInfoSync();
  void notificationService.initialize();
  void languageService.init();    // <-- YENİ
}, []);
```

Import sırası önemlidir: `'./src/i18n/i18n'` module-level side effect olarak i18next'i
başlatır. Bu satır diğer component/service importlarından önce gelmek zorundadır.

---

## 12. PRIORITY_OPTIONS ve REMINDER_OPTIONS

Bu diziler şu an static label string'leri içermektedir. i18n entegrasyonu sonrasında
`t()` çağrısını inline kullanmak yerine hook'lar aracılığıyla türetilmelidir:

```typescript
// Önerilen pattern — bileşen içinde hook ile üretilen dizi
function usePriorityOptions() {
  const { t } = useTranslation();
  return [
    { value: 'low',    label: t('todoForm.priority.low') },
    { value: 'normal', label: t('todoForm.priority.normal') },
    { value: 'high',   label: t('todoForm.priority.high') },
    { value: 'urgent', label: t('todoForm.priority.urgent') },
  ];
}

function useReminderOptions() {
  const { t } = useTranslation();
  return [
    { value: 'none',   label: t('todoForm.reminder.none') },
    { value: '5min',   label: t('todoForm.reminder.5min') },
    // ...
  ];
}
```

Bu hook'lar `TodoFormScreen.tsx` içinde ya da `src/hooks/` klasöründe tanımlanabilir.
Static module-level array olarak tutulmaları dil değişikliğinde güncellenmemelerine yol açar.

---

## 13. Yeni Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `mobile/src/i18n/i18n.ts` | i18next init, sync side-effect |
| `mobile/src/i18n/react-i18next.d.ts` | TypeScript CustomTypeOptions |
| `mobile/src/i18n/locales/tr.json` | Türkçe çeviriler (kaynak dil) |
| `mobile/src/i18n/locales/en.json` | İngilizce çeviriler |
| `mobile/src/services/language/languageService.ts` | AsyncStorage okuma/yazma, dil uygulama |
| `mobile/src/services/cache/cacheKeys.ts` | `LANGUAGE_KEY` sabiti (yeni dosya veya mevcut dosyaya ek) |
| `mobile/src/screens/SettingsScreen.tsx` | Dil seçim ekranı |

---

## 14. Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `mobile/package.json` | `i18next` ve `react-i18next` bağımlılıkları eklenir |
| `mobile/App.tsx` | `import './src/i18n/i18n'` + `languageService.init()` |
| `mobile/src/navigation/types.ts` | `AppStackParamList`'e `Settings: undefined` eklenir; `SettingsScreenProps` export edilir |
| `mobile/src/navigation/AppNavigator.tsx` | `Settings` rotası eklenir; tüm static `title` option'ları kaldırılır |
| `mobile/src/screens/TodoListScreen.tsx` | Hard-code string'ler `t()` ile değiştirilir; `useLayoutEffect` başlık |
| `mobile/src/screens/TodoFormScreen.tsx` | Hard-code string'ler `t()` ile değiştirilir; `useLayoutEffect` başlık |
| `mobile/src/screens/TaskDetailScreen.tsx` | Hard-code string'ler `t()` ile değiştirilir; `useLayoutEffect` başlık |
| `mobile/src/screens/profile/ProfileScreen.tsx` | Hard-code string'ler `t()` ile; Settings menü girişi |
| `mobile/src/screens/profile/ChangeEmailScreen.tsx` | Hard-code string'ler `t()` ile |
| `mobile/src/screens/profile/ChangePasswordScreen.tsx` | Hard-code string'ler `t()` ile |
| `mobile/src/screens/LoginScreen.tsx` | Hard-code string'ler `t()` ile |
| `mobile/src/screens/RegisterScreen.tsx` | Hard-code string'ler `t()` ile |
| `mobile/src/components/SearchBar.tsx` | `placeholder` prop'u `t('searchBar.placeholder')` ile |
| `mobile/src/components/DateTimePickerField.tsx` | İptal/Tamam/Tarih Seç/Saat Seç string'leri `t()` ile |

---

## 15. Kısıtlar ve Kurallar

1. **Tek namespace:** `translation` namespace kullanılır. Çoklu namespace bu sprint kapsamı dışındadır.
2. **tr.json kaynak dil:** Yeni string eklendiğinde önce `tr.json`'a eklenir, ardından `en.json`'a karşılığı yazılır.
3. **Hard-code yasak:** Bu doküman onaylandıktan sonra herhangi bir `.tsx` / `.ts` dosyasına Türkçe veya İngilizce hard-code UI string'i eklenemez.
4. **Backend değişmez:** Tüm çeviri client-side'dır. API hata mesajları bu sprint kapsamı dışındadır.
5. **Interpolation:** `{{variable}}` sözdizimi kullanılır (i18next default, güvenli).
6. **RTL:** Bu sprint kapsamı dışındadır; layout değişikliği yapılmaz.
7. **`compatibilityJSON: 'v4'`:** i18next v23 default'u; ileride v4 plural kurallarına geçişe hazırlar.

---

## 16. Referans Dokümanlar

- `docs/architecture.md` — genel mimari
- `docs/navigation.md` — navigation stack tasarımı
- `docs/persistence-architecture.md` — AsyncStorage kullanım pattern'leri
- `docs/i18n-spec.md` — BL-044 ürün gereksinim dokümanı
