# Feature: BL-044 — Çoklu Dil Desteği (i18n)

Versiyon: 1.0
Tarih: 2026-03-21
Hazırlayan: Product Manager Agent
Durum: Taslak
Hedef Sürüm: v1.0.0 — Sprint 1

---

## Overview ve Hedefler

### Genel Bakış

Uygulama şu anda yalnızca Türkçe çalışmaktadır; tüm UI string'leri kaynak dosyalarına hard-code edilmiş durumdadır. Bu durum iki somut soruna yol açmaktadır:

1. **Kapsam dışı kullanıcılar:** Türkçe bilmeyen kullanıcılar uygulamayı kullanamaz.
2. **Bakım zorluğu:** Yeni bir string eklemek için tek bir merkezi yer yoktur; string'ler ekranlara, bileşenlere ve utility'lere dağılmış haldedir.

Bu feature, `react-i18next` altyapısını kurarak tüm UI string'lerini merkezi çeviri dosyalarına taşır. İlk etapta iki dil desteklenir: Türkçe (`tr`) ve İngilizce (`en`). Kullanıcı dilini Ayarlar ekranından değiştirebilir; seçim AsyncStorage'a kalıcı olarak kaydedilir ve uygulama başlatıldığında geri yüklenir.

Bu sprint v1.0.0'ın **Sprint 1**'i olup temel altyapıdır. Bundan sonra eklenen tüm string'ler doğrudan çeviri dosyalarına yazılacaktır; kaynak dosyalara hard-code string eklenmesi kabul edilmeyecektir.

### Hedefler

| # | Hedef |
|---|-------|
| G-1 | Tüm hard-code UI string'leri `src/i18n/locales/tr.json` ve `en.json` dosyalarına taşınır |
| G-2 | Kullanıcı dili ayarlar ekranından değiştirebilir |
| G-3 | Seçilen dil uygulama kapatılıp açılsa da korunur |
| G-4 | Varsayılan dil sistem lokaline göre otomatik belirlenir |
| G-5 | Altyapı gelecekteki yeni dil eklemelerine hazır olur |
| G-6 | Backend API'ye hiçbir değişiklik yapılmaz |

---

## User Stories

### US-1 — Dil Değiştirme

**As a** uygulama kullanıcısı, **I want** ayarlar ekranından uygulamanın dilini Türkçe veya İngilizce olarak seçmek, **so that** uygulamayı tercih ettiğim dilde kullanabileyim.

### US-2 — Dil Tercihi Kalıcılığı

**As a** uygulama kullanıcısı, **I want** seçtiğim dilin uygulamayı kapatıp açtığımda da geçerli kalmasını, **so that** her açılışta tekrar seçmek zorunda kalmayayım.

### US-3 — Otomatik Dil Algılama

**As a** uygulamayı ilk kez açan kullanıcı, **I want** uygulamanın cihazımın diline göre otomatik bir dil seçmesini, **so that** manuel bir tercih yapmadan doğal dilimde karşılanayım.

### US-4 — Tutarlı Arayüz Dili

**As a** İngilizce dil seçmiş kullanıcı, **I want** uygulamanın tüm ekranlarında (görev listesi, form, profil, giriş vb.) tutarlı olarak İngilizce görmek, **so that** karışık dil deneyimi yaşamayayım.

---

## Acceptance Criteria

### Altyapı

- [ ] `react-i18next` ve `i18next` paketleri `mobile/package.json`'a eklenmiştir.
- [ ] `mobile/src/i18n/i18n.ts` dosyası mevcuttur ve i18next başlatma konfigürasyonunu içerir.
- [ ] `mobile/src/i18n/locales/tr.json` dosyası mevcuttur ve tüm Türkçe çeviri anahtarlarını içerir.
- [ ] `mobile/src/i18n/locales/en.json` dosyası mevcuttur ve `tr.json` ile birebir aynı anahtar setini içerir; hiçbir anahtar eksik değildir.
- [ ] `App.tsx` veya kök bileşen, uygulama başlamadan önce i18n konfigürasyonunu import eder.

### Dil Kalıcılığı

- [ ] Kullanıcı dili değiştirdiğinde seçim AsyncStorage'a `@app:language` anahtarıyla kaydedilir.
- [ ] Uygulama başlatıldığında AsyncStorage'dan dil tercihi okunur ve i18next'e uygulanır.
- [ ] AsyncStorage'da kayıtlı tercih yoksa sistem lokali kontrol edilir: sistem dili `tr` ise `tr`, aksi hâlde `en` seçilir.

### Dil Seçimi UI

- [ ] Ayarlar ekranı (`SettingsScreen`) navigasyon grafiğine eklenmiştir; `ProfileScreen` menüsünden erişilebilir.
- [ ] Ayarlar ekranında dil seçim alanı bulunur: iki seçenek (`Türkçe` / `English`) listelenir.
- [ ] Aktif dil seçeneği görsel olarak vurgulanmıştır (seçili durum belirgindir).
- [ ] Dil seçildiğinde uygulama arayüzü anında (app restart gerekmeden) yeni dile geçer.

### String Kapsamı

- [ ] `TodoListScreen` içindeki tüm hard-code Türkçe string'ler `t()` çağrısıyla değiştirilmiştir.
- [ ] `TodoFormScreen` içindeki tüm hard-code Türkçe string'ler `t()` çağrısıyla değiştirilmiştir.
- [ ] `TaskDetailScreen` içindeki tüm hard-code Türkçe string'ler `t()` çağrısıyla değiştirilmiştir.
- [ ] `LoginScreen` içindeki tüm hard-code string'ler `t()` çağrısıyla değiştirilmiştir.
- [ ] `RegisterScreen` içindeki tüm hard-code string'ler `t()` çağrısıyla değiştirilmiştir.
- [ ] `ProfileScreen` içindeki tüm hard-code Türkçe string'ler `t()` çağrısıyla değiştirilmiştir.
- [ ] `ChangeEmailScreen` içindeki tüm hard-code Türkçe string'ler `t()` çağrısıyla değiştirilmiştir.
- [ ] `ChangePasswordScreen` içindeki tüm hard-code Türkçe string'ler `t()` çağrısıyla değiştirilmiştir.
- [ ] `SearchBar` bileşenindeki varsayılan `placeholder` değeri `t()` ile sağlanır.
- [ ] `DateTimePickerField` bileşenindeki "İptal", "Tamam", "Tarih Seç", "Saat Seç" string'leri `t()` ile sağlanır.
- [ ] `PRIORITY_OPTIONS` ve `REMINDER_OPTIONS` dizilerindeki label string'leri çeviri anahtarlarından beslenir.
- [ ] Navigation başlıkları (`title` seçeneği) `t()` ile set edilir.
- [ ] Hiçbir `.tsx` veya `.ts` dosyasında Türkçe hard-code UI string'i kalmamıştır.

### TypeScript

- [ ] `npx tsc --noEmit` hatasız çalışır.
- [ ] Çeviri anahtarları TypeScript tarafından tip-güvenli biçimde erişilebilir (en az `DefaultResources` deklarasyonu yapılmış olmalı).

---

## Scope

### In Scope

- `react-i18next` + `i18next` kurulumu ve konfigürasyonu
- `src/i18n/locales/tr.json` — Türkçe çeviri dosyası
- `src/i18n/locales/en.json` — İngilizce çeviri dosyası
- Tüm mevcut ekranlar ve bileşenlerden hard-code string extraction
- Yeni `SettingsScreen` (bu sprint'te yalnızca dil seçeneği içerir)
- `ProfileScreen` menüsüne "Ayarlar" girişi eklenmesi
- AsyncStorage'a dil tercihi kaydetme ve geri yükleme
- Sistem lokali ile otomatik varsayılan dil belirleme
- TypeScript tip tanımları (`react-i18next.d.ts`)

### Out of Scope

- Üçüncü bir dil eklenmesi (bu sprint'te yalnızca `tr` ve `en`)
- RTL (sağdan sola) layout desteği
- Backend API hata mesajlarının çevrilmesi
- `formatDate` utility'sinin lokale göre değişimi
- `DateTimePickerField` içindeki `locale="tr-TR"` prop'unun dinamik hale getirilmesi
- Otomatik çeviri servisi entegrasyonu
- Çoklu namespace desteği (tek `translation` namespace yeterli)

---

## Dependencies

- Requires: `AsyncStorage` (v0.3.0'dan itibaren projede mevcut)
- Requires: `react-navigation` (header title güncelleme için)
- Requires: `ProfileScreen` ve navigation graph'ı (v0.7.0'dan itibaren mevcut)
- New package: `react-i18next` + `i18next`

---

## UI Mockup Açıklamaları

### SettingsScreen

```
┌──────────────────────────────────┐
│  ← Ayarlar / Settings            │
├──────────────────────────────────┤
│                                  │
│  DİL / LANGUAGE                  │
│  ┌────────────────────────────┐  │
│  │  Türkçe              [✓]  │  │  <- Aktif dil: sağda checkmark
│  │────────────────────────────│  │
│  │  English                   │  │  <- Pasif dil
│  └────────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
```

- ProfileScreen ile aynı gradient arka plan ve kart yapısı
- Dile tıklandığında arayüz anında değişir; onay diyaloğu yok

### ProfileScreen — Ayarlar Girişi

```
┌────────────────────────────────────┐
│  Email Değiştir                  › │
│────────────────────────────────────│
│  Şifre Değiştir                  › │
│────────────────────────────────────│
│  Ayarlar                         › │  <- Yeni satır
│────────────────────────────────────│
│  Hesabı Sil                      › │
└────────────────────────────────────┘
```

---

## Çeviri Anahtarı Adlandırma Kuralları

1. Tüm anahtarlar `camelCase` kullanır.
2. Anahtarlar ekran/bileşen bazında gruplandırılır (nested JSON).
3. Ortak string'ler `common` grubu altına alınır.
4. Interpolation için `{{variable}}` sözdizimi kullanılır.

### Anahtar Envanteri

```
common:        loading, error, retry, save, cancel, delete, edit, ok
todoList:      screenTitle, emptyState, noSearchResult, deleteTitle, deleteMessage, pendingLabel
todoForm:      titleCreate, titleEdit, fieldTitle, fieldDescription, fieldPriority, fieldDueDate,
               fieldAllDay, fieldReminder, placeholderTitle, validationTitleRequired,
               pastDateTitle, pastDateMessage, buttonSave, buttonUpdate,
               priority.(low|normal|high|urgent), reminder.(none|5min|15min|30min|1hour|1day)
taskDetail:    pendingBanner, statusCompleted, statusInProgress, pinned, noDescription,
               actionEdit, actionComplete, actionUndo, actionPin, actionDelete,
               deleteTitle, deleteMessage
login:         title, subtitle, placeholderEmail, placeholderPassword, buttonLogin,
               linkNoAccount, linkRegister, errorGeneric
register:      title, subtitle, placeholderEmail, placeholderPassword, placeholderPasswordConfirm,
               buttonRegister, linkHasAccount, linkLogin, errorPasswordMismatch, errorGeneric
profile:       menuChangeEmail, menuChangePassword, menuSettings, menuDeleteAccount,
               buttonLogout, errorLoad, deleteModalTitle, deleteModalWarning,
               deleteModalPlaceholder, deleteModalButton, deleteModalCancel, errorDeleteGeneric
changeEmail:   labelNewEmail, labelCurrentPassword, placeholderNewEmail, placeholderPassword, buttonSave, errorGeneric
changePassword: labelCurrentPassword, labelNewPassword, labelConfirmPassword,
                placeholderCurrent, placeholderNew, placeholderConfirm,
                buttonSave, buttonCancel, errorMismatch, errorGeneric, successMessage
settings:      screenTitle, sectionLanguage, languageTurkish, languageEnglish
searchBar:     placeholder
dateTimePicker: cancel, confirm, titleDate, titleTime
```

---

## Teknik Notlar (Architect'e)

- `react-i18next` + `i18next` versiyon sabitleme (Expo SDK uyumluluğu)
- i18n başlatma stratejisi: sync init vs. Suspense
- TypeScript: `react-i18next.d.ts` ile `DefaultResources` deklarasyonu
- Dil değişikliğinde navigation başlıklarını güncelleme standardı
- `@app:language` key'i mevcut `cacheKeys.ts`'e eklenip eklenmeyeceği
