# EAS Build Mimarisi — BL-033

**Version:** 1.0
**Date:** 2026-03-22
**Target Release:** v1.0.0 Sprint 5
**Author:** Architect Agent
**Spec:** `docs/eas-build-spec.md`

---

## 1. Genel Bakış

Bu belge, projenin Expo Go tabanlı geliştirme akışından EAS Build tabanlı native binary pipeline'ına geçişini tasarlar. Değişiklikler yalnızca `mobile/` dizinini etkiler; backend'e dokunulmaz.

### Motivasyon

| Mevcut Durum | Hedef Durum |
|---|---|
| Expo Go üzerinde çalışır | Gerçek native binary üretilir |
| Native modül kısıtlamaları var | Tüm native modüller desteklenir |
| Dağıtım yalnızca Expo Go ile mümkün | Internal + Store dağıtımı mümkün |
| App Store / Play Store'a gönderilemez | Store submission hazır pipeline |

### Etkilenen Dosyalar

```
mobile/
├── eas.json          ← Yeni oluşturulacak
├── app.json          ← 3 alan eklenecek (mevcut içerik korunur)
└── package.json      ← expo-dev-client dependency eklenecek
docs/
└── eas-build-guide.md ← Yeni oluşturulacak
```

---

## 2. eas.json Yapısı

`mobile/eas.json` dosyası aşağıdaki içerikle oluşturulmalıdır. Bu dosya EAS CLI tarafından okunur ve mevcut herhangi bir dosyanın yerini almaz.

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "distribution": "store",
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### Build Profil Tablosu

| Profil | Hedef Kitle | iOS Çıktısı | Android Çıktısı | Dağıtım Kanalı |
|---|---|---|---|---|
| `development` | Geliştirici | Simulator `.app` | APK | Internal (EAS) |
| `preview` | QA / Test ekibi | IPA (device) | APK | Internal (EAS) |
| `production` | Son kullanıcı | IPA (App Store) | AAB | App Store / Play Store |

**Tasarım kararları:**

- `development` profilinde `ios.simulator: true` seçildi. Bu sayede Apple Developer sertifikası olmadan iOS Simulator'da test edilebilir.
- `development` Android çıktısı APK olarak belirlendi. APK, fiziksel cihaza veya emülatöre doğrudan yüklenebilir; AAB gerektirmez.
- `preview` profili yalnızca internal QA dağıtımı içindir, sertifika yönetimi EAS'a devredilir.
- `production` Android çıktısı AAB (App Bundle) olarak belirlendi. Play Store, AAB formatını zorunlu kılar ve optimize edilmiş dağıtım sağlar.
- `cli.version` kısıtlaması `>= 12.0.0` olarak belirlendi. EAS CLI 12+ gerekli API formatını ve `expo-dev-client` entegrasyonunu destekler.

---

## 3. app.json Değişiklikleri

`mobile/app.json` dosyasının mevcut içeriği **korunur**. Yalnızca üç alan eklenir. Değişiklik, `expo` objesinin en üst seviyesine yapılır.

### Eklenecek Alanlar

```json
{
  "expo": {
    "runtimeVersion": { "policy": "appVersion" },
    "updates": {
      "url": "https://u.expo.dev/PLACEHOLDER_PROJECT_ID"
    },
    "extra": {
      "eas": {
        "projectId": "PLACEHOLDER_PROJECT_ID"
      }
    }
  }
}
```

### Alan Açıklamaları

| Alan | Değer | Amaç |
|---|---|---|
| `runtimeVersion.policy` | `"appVersion"` | OTA güncellemesinin hangi binary versiyonuyla uyumlu olduğunu belirler. `appVersion` kullanıldığında `package.json` version değeri (şu an `1.0.0`) runtime version olarak kullanılır. |
| `updates.url` | `https://u.expo.dev/<projectId>` | EAS Update servisinin OTA bundle'ları sunduğu endpoint. |
| `extra.eas.projectId` | PLACEHOLDER | EAS projesinin UUID'si. `eas init` komutu çalıştırıldığında otomatik doldurulur. |

**Kritik:** `PLACEHOLDER_PROJECT_ID` değerleri geliştirici `eas init` komutunu çalıştırana kadar placeholder olarak kalır. `eas init` bu iki alanı gerçek UUID ile günceller. Placeholder ile build alınmamalıdır.

### `runtimeVersion` Politika Seçimi Gerekçesi

`appVersion` politikası seçildi çünkü:
- Native kodu değiştiren her değişiklik zaten `version` bump'ı gerektirir (App Store kuralı)
- `fingerprint` politikasına kıyasla daha öngörülebilirdir
- Mevcut `package.json`'daki `"version": "1.0.0"` değeriyle uyumludur

---

## 4. expo-dev-client Entegrasyonu

### Paket Kurulumu

```bash
cd mobile && npx expo install expo-dev-client
```

`npx expo install` komutu `expo` SDK versiyonuyla (şu an `~55.0.4`) uyumlu paketi seçer ve `package.json`'a ekler. `npm install` veya `yarn add` kullanılmamalıdır; versiyon uyumsuzluğuna yol açar.

Kurulumdan sonra beklenen `package.json` değişikliği:

```json
"dependencies": {
  "expo-dev-client": "~5.x.x"
}
```

Tam versiyon numarası `npx expo install` tarafından belirlenir; bu belgede sabit bir değer verilmez.

### App.tsx Değişikliği

Managed workflow kullandığı için `App.tsx`'e herhangi bir import veya kod değişikliği **gerekmez**. `expo-dev-client`, Expo'nun plugin sistemi aracılığıyla native katmana otomatik entegre olur.

### Başlatma Komutu Değişikliği

| Senaryo | Komut |
|---|---|
| Expo Go ile çalıştırma (mevcut, bozulmaz) | `npx expo start` |
| Dev Client ile çalıştırma | `npx expo start --dev-client` |
| Dev Client + Tunnel | `npx expo start --dev-client --tunnel` |

`npx expo start` (Expo Go) akışı bu değişiklikten etkilenmez ve çalışmaya devam eder. Acceptance criteria'daki "Expo Go flow not broken" gereksinimi bu sayede karşılanır.

---

## 5. OTA Update Mimarisi

EAS Update, native binary değişikliği gerektirmeyen JS/asset güncellemelerini store yayını olmadan cihaza iletir.

```
Developer
    │  eas update --branch preview --message "Fix typo"
    ▼
EAS Update Servisi
    │  OTA bundle yükler
    ▼
u.expo.dev/<projectId>
    │  Uygulama başlangıcında kontrol eder
    ▼
Cihaz (app launch)
    │  Yeni bundle varsa indirir
    ▼
Sonraki uygulama açılışında yeni versiyon aktif olur
```

**Kısıt:** OTA update yalnızca aynı `runtimeVersion` değerine sahip binary'lere uygulanabilir. Native kod değişikliklerinde (yeni native modül, SDK upgrade) yeni binary build zorunludur.

---

## 6. Build Pipeline Akışı

```
eas build --profile development --platform ios
    │
    ├── EAS sunucusuna kaynak kod gönderilir
    ├── expo-dev-client native modülü build'e dahil edilir
    ├── iOS: Simulator .app paketi üretilir
    └── Build artifact EAS sunucusunda saklanır

eas build --profile preview --platform android
    │
    ├── Android: APK üretilir
    ├── Internal distribution URL oluşturulur
    └── QR kod ile cihaza doğrudan yüklenebilir

eas build --profile production --platform android
    │
    ├── Android: AAB (App Bundle) üretilir
    └── Play Store'a yüklemeye hazır artifact
```

---

## 7. Oluşturulacak / Değiştirilecek Dosyalar

| Dosya | Aksiyon | Açıklama | Sorumlu |
|---|---|---|---|
| `mobile/eas.json` | Oluştur | EAS build profilleri (Bölüm 2'deki exact içerik) | Backend/Frontend Dev |
| `mobile/app.json` | Değiştir | `runtimeVersion`, `updates`, `extra.eas` ekle (Bölüm 3) | Backend/Frontend Dev |
| `mobile/package.json` | Değiştir | `npx expo install expo-dev-client` ile dependency eklenir | Backend/Frontend Dev |
| `docs/eas-build-guide.md` | Oluştur | Geliştirici rehberi (Bölüm 8) | Backend/Frontend Dev |

---

## 8. docs/eas-build-guide.md İçerik Şartnamesi

Geliştirici tarafından yazılacak `docs/eas-build-guide.md` dosyası aşağıdaki bölümleri içermelidir. Sıralama zorunludur.

### Bölüm 1: Ön Koşullar

Aşağıdakiler listelenmeli ve minimum versiyon belirtilmeli:
- Node.js (minimum versiyon)
- EAS CLI (`npm install -g eas-cli`, minimum versiyon `12.0.0`)
- Expo hesabı (expo.dev üyeliği)
- iOS build için Xcode (simulator build için yeterli, device build için Apple Developer hesabı gerekir)
- Android build için ayrıca lokal araç gerekmez (cloud build)

### Bölüm 2: İlk Kurulum

Adım adım:
1. `eas login` — Expo hesabına giriş
2. `eas init` — EAS projesi oluşturma ve `projectId` atama
3. `app.json` içindeki `PLACEHOLDER_PROJECT_ID` değerlerinin gerçek UUID ile güncellendiğinin doğrulanması
4. `npx expo install --check` çalıştırarak versiyon uyumluluğunun doğrulanması

### Bölüm 3: Lokal Geliştirme Build'i

- iOS Simulator build: `eas build --profile development --platform ios`
- Android Emulator / Fiziksel Cihaz build: `eas build --profile development --platform android`
- Build tamamlandıktan sonra Simulator / emülatöre yükleme adımları
- `npx expo start --dev-client` komutu ile bağlantı kurma

### Bölüm 4: Cloud Build Komutları

Her profil için komut tablosu:

| Platform | Profil | Komut |
|---|---|---|
| iOS | development | `eas build --profile development --platform ios` |
| Android | development | `eas build --profile development --platform android` |
| iOS | preview | `eas build --profile preview --platform ios` |
| Android | preview | `eas build --profile preview --platform android` |
| iOS | production | `eas build --profile production --platform ios` |
| Android | production | `eas build --profile production --platform android` |
| Tümü | production | `eas build --profile production --platform all` |

### Bölüm 5: Preview Build Yükleme

- EAS dashboard'dan QR kod ile yükleme (iOS TestFlight / Android APK)
- Direct download linki ile yükleme
- Android APK için "Bilinmeyen kaynaklardan yükleme" ayarı notu

### Bölüm 6: OTA Update

- `eas update --branch preview --message "<açıklama>"` komutu
- Branch kavramı (preview, production)
- `runtimeVersion` uyumsuzluğu durumunda güncellemenin uygulanmayacağı uyarısı
- Hangi değişikliklerin OTA ile gönderilebileceği, hangilerinin yeni native build gerektirdiği

### Bölüm 7: Yaygın Sorunlar ve Çözümler

Aşağıdaki senaryolar için sorun/çözüm çifti:
- `PLACEHOLDER_PROJECT_ID` değerinin güncellenmemiş olması
- EAS CLI versiyon uyumsuzluğu (`cli.version` hatası)
- `npx expo install --check` uyarıları
- iOS Simulator build'in cihaza yüklenememesi (simulator build fiziksel cihazda çalışmaz)
- `eas init` sırasında mevcut `eas.json`'ın üzerine yazılma riski (önce commit et)

---

## 9. Bağımlılıklar ve Kısıtlamalar

### Mevcut Uyumlu Paketler

`app.json`'daki aşağıdaki native plugin'ler EAS Build ile uyumludur, ek konfigürasyon gerekmez:

| Plugin | app.json Kaydı |
|---|---|
| expo-notifications | `plugins` dizisinde tanımlı |
| expo-secure-store | `plugins` dizisinde tanımlı |
| @react-native-community/datetimepicker | `plugins` dizisinde tanımlı |

`bundleIdentifier: "com.mgecmez.aitodolab"` ve `android.package: "com.mgecmez.aitodolab"` zaten `app.json`'da tanımlıdır; EAS bu değerleri otomatik okur.

### Bu Tasarımın Kapsam Dışı Bıraktıkları

| Konu | Neden Kapsam Dışı |
|---|---|
| Apple Developer sertifika yönetimi | Hesap bağlantısı geliştirici yapılandırması |
| App Store / Play Store submission | BL-033 sadece build pipeline kurar |
| TestFlight / Firebase App Distribution | Dağıtım platform entegrasyonu ayrı sprint |
| APNs push sertifikaları | BL-017 push notification sprint'i kapsar |
| GitHub Actions CI/CD | Ayrı CI/CD sprint'i gerektirir |
| Expo SDK upgrade | Versiyon yükseltme ayrı iş kalemi |

### Bu Tasarımın Açtığı Backlog Maddeleri

Bu sprint tamamlandığında aşağıdaki backlog maddeleri uygulanabilir hale gelir:
- **BL-017** — Push Notifications (native build gerektirir)
- **BL-032** — Sentry entegrasyonu (native SDK gerektirir)
- **BL-038** — Widget (native extension gerektirir)

---

## 10. Kabul Kriterleri Doğrulama Matrisi

| Kriter | Doğrulama Yöntemi |
|---|---|
| `mobile/eas.json` üç profil içeriyor | Dosya içeriği incelenir |
| `development`: `developmentClient: true`, `distribution: "internal"` | `eas.json` doğrulanır |
| `preview`: `distribution: "internal"` | `eas.json` doğrulanır |
| `production`: `distribution: "store"` | `eas.json` doğrulanır |
| `expo-dev-client` `package.json`'da mevcut | `dependencies` kontrol edilir |
| `app.json`: `runtimeVersion` eklendi | Alan varlığı kontrol edilir |
| `app.json`: `updates.url` eklendi | Alan varlığı, `PLACEHOLDER` yerine gerçek ID kontrol edilir |
| `npx expo install --check` — hata yok | CI veya lokal çıktı |
| `npx tsc --noEmit` — sıfır hata | CI veya lokal çıktı |
| `dotnet build` — geçiyor | CI veya lokal çıktı |
| `docs/eas-build-guide.md` mevcut | Dosya varlığı + Bölüm 8 şartnamesine uygunluk |
| `npx expo start` hala çalışıyor | Manuel test (Expo Go akışı) |
