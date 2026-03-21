# Onboarding Architecture — BL-030 + BL-031

**Version:** 1.0  
**Date:** 2026-03-22  
**Target Release:** v1.0.0 Sprint 3  
**Author:** Architect  
**Spec:** `docs/onboarding-spec.md`

---

## 1. Overview

Bu belge iki backlog kalemini kapsar:

- **BL-030** — 5 slaytlık onboarding akışı: ilk açılışta gösterilir, tamamlanınca bir daha gösterilmez.
- **BL-031** — App icon ve splash screen yapılandırması: `app.json` değişiklikleri ve asset altyapısı.

---

## 2. RootNavigator Stratejisi (BL-030)

### 2.1 Mevcut Durum

`RootNavigator.tsx` şu anda `AuthContext`'ten gelen `token` ve `isLoading` değerlerini okur. `AuthContext`, mount sırasında `SecureStore`'dan token'ı restore eder ve `isLoading` flag'ini yönetir.

### 2.2 Tasarım Kararı: OnboardingScreen, Ayrı Navigator Değil, Koşullu Render

İki seçenek değerlendirildi:

| Seçenek | Açıklama | Karar |
|---------|----------|-------|
| A — Ayrı `OnboardingNavigator` | Kendi `createNativeStackNavigator`'ı olan ayrı bir navigator | Reddedildi |
| B — RootNavigator içinde koşullu render | `onboardingDone` state'ine göre tek bir `<OnboardingScreen />` render edilir | **Kabul edildi** |

**Gerekçe:** Onboarding tek bir ekrandır; slayt geçişleri ekran içi state ile yönetilir. Ayrı bir Stack Navigator gereksiz navigasyon karmaşıklığı yaratır. Onboarding tamamlandığında, flag yazılır ve `setOnboardingDone(true)` çağrılarak React re-render tetiklenir — navigasyon API'si kullanılmaz.

### 2.3 RootNavigator Yeni Yapısı

`RootNavigator` şu anda `AuthContext.isLoading` flag'ini bekler. Onboarding bayrağı da aynı loading süreci içinde `AsyncStorage`'dan paralel olarak okunmalıdır.

**Kritik nokta:** `AuthContext`'in `isLoading` state'i `SecureStore.getItemAsync` için zaten bir `Promise.all` kullanıyor. Onboarding bayrağı `AsyncStorage`'dan okunur (farklı depolama katmanı), bu nedenle okuma `AuthContext` içine entegre edilmez. Bunun yerine `RootNavigator` kendi `onboardingDone` state'ini yönetir ve `AuthContext.isLoading` bitmeden önce tamamlanmış olması beklenir.

Yeni akış:

```
RootNavigator mount
    │
    ├─ AuthContext.isLoading = true → loading spinner
    │
    ├─ AuthContext.isLoading = false → onboarding state'i kontrol et
    │       │
    │       ├─ onboardingDone = null (henüz yüklenmedi) → loading spinner
    │       ├─ onboardingDone = false → <OnboardingScreen />
    │       └─ onboardingDone = true + token = null  → <AuthNavigator />
    │                           onboardingDone = true + token != null → <AppNavigator />
```

**State yapısı:**

```typescript
// RootNavigator içinde
const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

useEffect(() => {
  AsyncStorage.getItem(ONBOARDING_KEY).then(value => {
    setOnboardingDone(value === 'true');
  });
}, []);
```

**Loading koşulu:** `isLoading || onboardingDone === null` ise spinner gösterilir.

**Render kararı:**

```typescript
if (!onboardingDone) {
  return <OnboardingScreen onComplete={() => setOnboardingDone(true)} />;
}
return token !== null ? <AppNavigator /> : <AuthNavigator />;
```

### 2.4 OnboardingScreen'den AuthNavigator'a Geçiş

`OnboardingScreen` prop olarak `onComplete: () => void` alır. CTA butonlarına tıklandığında:

1. `AsyncStorage.setItem(ONBOARDING_KEY, 'true')` yazılır.
2. `onComplete()` çağrılır → RootNavigator `onboardingDone = true` yapar → React re-render → AuthNavigator gösterilir.
3. AuthNavigator'ın ilk ekranı Login'dir. "Hesap Oluştur" için `initialRouteName="Register"` parametresi verilmesi gerekmez; bunun yerine `onComplete` prop'u hangi CTA'ya basıldığını da taşıyabilir.

**Önerilen prop tasarımı:**

```typescript
type OnboardingScreenProps = {
  onComplete: (destination: 'login' | 'register') => void;
};
```

`RootNavigator`, `destination` parametresini AuthNavigator'ı başlatmadan önce bir `initialRoute` state'inde saklayabilir. Ancak AuthNavigator zaten Login'i ilk ekran olarak tanımlıyor; Register'a yönlendirmek için `AuthNavigator` içindeki `initialRouteName` prop'unun dışarıdan kontrol edilmesi gerekir ya da `AuthContext` düzeyinde bir başlangıç rotası state'i tutulur.

**Daha sade tercih edilen yaklaşım:** `onComplete` sadece `void` döner, her iki CTA da doğrudan kendi ekranına navigate eder. Bunun için OnboardingScreen'in, `useNavigation` hook'u yerine `onComplete` callback'i aracılığıyla çalışması ve `AuthNavigator`'ın hangi sıraya göre ekranları kaydettiğine güvenmesi yeterlidir. Login → Register, AuthNavigator içinde zaten birbirine link veriyor. Bu tasarımı basit tutan yaklaşımdır ve sağlamlık/test edilebilirlik açısından uygundur.

---

## 3. OnboardingScreen Yapısı (BL-030)

### 3.1 Slayt Yönetimi: useState + Manuel Geçiş

İki seçenek değerlendirildi:

| Seçenek | Açıklama | Karar |
|---------|----------|-------|
| FlatList + `horizontal` + `pagingEnabled` | Swipe jestüyle doğal kaydırma | Reddedildi |
| `useState(currentSlide)` + koşullu render | Sade, animasyon gerektirmez | **Kabul edildi** |

**Gerekçe:** Spec'te "slide animations / parallax" açıkça kapsam dışı bırakılmıştır. `FlatList` ile swipe eklenirse slayt 5'in "no Skip, no Next" koşulunu `scrollEnabled={currentSlide < 4}` ile engellemek gerekir; bu ek karmaşıklık getirir. `useState` yaklaşımı sıfır bağımlılıkla çalışır ve test edilmesi kolaydır.

### 3.2 Slide Veri Modeli

```typescript
type SlideData = {
  key: string;
  icon?: string;          // Ionicons name, slide 5'te yok
  headline?: string;      // slide 1'de yok (appName kullanılır)
  body?: string;          // slide 5'te yok
  isCta: boolean;         // true: slide 5
};

const SLIDES: SlideData[] = [
  { key: 'slide1', icon: 'checkmark-circle',              isCta: false },
  { key: 'slide2', icon: 'checkmark-done-circle-outline', isCta: false },
  { key: 'slide3', icon: 'alarm-outline',                 isCta: false },
  { key: 'slide4', icon: 'cloud-offline-outline',         isCta: false },
  { key: 'slide5',                                        isCta: true  },
];
```

### 3.3 Bileşen Taslağı

```typescript
// mobile/src/screens/OnboardingScreen.tsx

type Props = {
  onComplete: () => void;
};

export default function OnboardingScreen({ onComplete }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useTranslation();

  const handleNext = () => setCurrentSlide(s => Math.min(s + 1, 4));
  const handleSkip = () => setCurrentSlide(4);  // flag YAZILMAZ
  const handleCta = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  };

  // ...
}
```

### 3.4 Slayt İçerik Eşleme

| `currentSlide` | Icon | Headline key | Body key |
|----------------|------|--------------|----------|
| 0 | `checkmark-circle` | — (app adı sabit) | `onboarding.slide1.tagline` |
| 1 | `checkmark-done-circle-outline` | `onboarding.slide2.headline` | `onboarding.slide2.body` |
| 2 | `alarm-outline` | `onboarding.slide3.headline` | `onboarding.slide3.body` |
| 3 | `cloud-offline-outline` | `onboarding.slide4.headline` | `onboarding.slide4.body` |
| 4 | — | `onboarding.slide5.headline` | — (CTA butonları) |

### 3.5 Slayt Gösterge Tasarımı

Spec tanımına göre:
- Aktif pill: genişlik 33px, yükseklik 9px, renk `colors.textOnDark` (beyaz), opaklık 1.0
- Pasif pill: genişlik 18px, yükseklik 9px, renk `colors.textOnDark`, opaklık 0.4
- Aralarındaki boşluk: 9px (`spacing.sm + 1` veya sabit 9)
- Border radius: `radius.full` (9999 — tam oval)

### 3.6 Gradient

`expo-linear-gradient` kullanılarak `gradient.screen` token'ı uygulanır:

```typescript
import { LinearGradient } from 'expo-linear-gradient';
import { gradient } from '../theme/tokens';

<LinearGradient
  colors={gradient.screen.colors}
  start={gradient.screen.start}
  end={gradient.screen.end}
  style={StyleSheet.absoluteFill}
/>
```

Slide 5 CTA buton stilleri:
- "Hesap Oluştur" (primary): `backgroundColor: colors.authButtonBg`
- "Giriş Yap" (secondary): `borderWidth: 1, borderColor: colors.textOnDark, backgroundColor: 'transparent'`

---

## 4. AsyncStorage Anahtarı (BL-030)

### 4.1 cacheKeys.ts Değişikliği

Dosya: `mobile/src/services/cache/cacheKeys.ts`

Mevcut içerik:
```typescript
export const LANGUAGE_KEY = '@app:language';
```

Eklenecek satır:
```typescript
export const ONBOARDING_KEY = '@app:onboarding:done';
```

Tam dosya içeriği sonrasında:
```typescript
export const LANGUAGE_KEY = '@app:language';
export const ONBOARDING_KEY = '@app:onboarding:done';
```

**Anahtar adı neden `@app:onboarding:done`?** Mevcut `@app:language` kuralına uygun namespace kullanıldı. `onboardingDone` spec'te `@app:onboardingDone` olarak geçse de tutarlılık için iki-noktalı separator ile `@app:onboarding:done` tercih edildi. Frontend Dev bu ismi birebir kullanmalıdır.

---

## 5. i18n Anahtarları (BL-030)

### 5.1 tr.json ve en.json'a Eklenecek Blok

Her iki locale dosyasına (`mobile/src/i18n/locales/tr.json`, `mobile/src/i18n/locales/en.json`) aşağıdaki üst düzey `"onboarding"` bloğu mevcut son anahtardan sonra eklenir.

**tr.json eklemesi:**

```json
"onboarding": {
  "slide1": {
    "tagline": "Görevlerini yönet, hedeflerine ulaş"
  },
  "slide2": {
    "headline": "Görevlerini Organize Et",
    "body": "Oluştur, önceliklendir ve sabitle. Her şey tek bir yerde."
  },
  "slide3": {
    "headline": "Hiçbir Tarihi Kaçırma",
    "body": "Son tarih belirle, tam zamanında hatırlatıcı al."
  },
  "slide4": {
    "headline": "İnternetsiz de Çalışır",
    "body": "Bağlantın yokken de görev ekle. Bağlantı gelince otomatik senkronize olur."
  },
  "slide5": {
    "headline": "Hazır mısın?"
  },
  "cta": {
    "register": "Hesap Oluştur",
    "login": "Giriş Yap"
  },
  "skip": "Atla",
  "next": "İleri"
}
```

**en.json eklemesi:**

```json
"onboarding": {
  "slide1": {
    "tagline": "Manage your tasks, reach your goals"
  },
  "slide2": {
    "headline": "Organize Your Tasks",
    "body": "Create, prioritize and pin. Everything in one place."
  },
  "slide3": {
    "headline": "Never Miss a Deadline",
    "body": "Set a due date, get reminded right on time."
  },
  "slide4": {
    "headline": "Works Offline Too",
    "body": "Add tasks without a connection. Auto-syncs when you're back online."
  },
  "slide5": {
    "headline": "Ready to Start?"
  },
  "cta": {
    "register": "Create Account",
    "login": "Sign In"
  },
  "skip": "Skip",
  "next": "Next"
}
```

### 5.2 Kullanım Örnekleri

```typescript
t('onboarding.slide1.tagline')
t('onboarding.slide2.headline')
t('onboarding.slide2.body')
t('onboarding.slide5.headline')
t('onboarding.cta.register')
t('onboarding.cta.login')
t('onboarding.skip')
t('onboarding.next')
```

Slide 1'in `headline` değeri yoktur; uygulama adı sabit metin olarak ya da ayrı bir token (ör. `common.appName`) üzerinden sağlanır.

---

## 6. Dosya Listesi

### 6.1 Yeni Dosyalar

| Dosya | Sahip | Açıklama |
|-------|-------|----------|
| `mobile/src/screens/OnboardingScreen.tsx` | Frontend Dev | 5 slaytlık onboarding ekranı |

### 6.2 Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `mobile/src/navigation/RootNavigator.tsx` | `onboardingDone` state eklenir; loading ve render koşulları güncellenir |
| `mobile/src/navigation/types.ts` | Onboarding için ayrı navigator yoktur, yeni tip gerekmez |
| `mobile/src/services/cache/cacheKeys.ts` | `ONBOARDING_KEY` export'u eklenir |
| `mobile/src/i18n/locales/tr.json` | `onboarding.*` bloğu eklenir |
| `mobile/src/i18n/locales/en.json` | `onboarding.*` bloğu eklenir |
| `mobile/app.json` | Splash ve adaptive icon alanları güncellenir (bkz. Bölüm 8) |

### 6.3 types.ts Değişmeme Gerekçesi

`OnboardingScreen` ayrı bir Stack ekranı değil; `RootNavigator`'ın doğrudan render ettiği bir bileşendir. Bu nedenle `AppStackParamList` veya `AuthStackParamList`'e yeni bir rota eklenmesi gerekmez. `OnboardingScreenProps` tipi doğrudan `Props = { onComplete: () => void }` olarak tanımlanır.

---

## 7. Navigasyon Akışı (Özet)

```
App Launch
    │
    ▼
App.tsx → AuthProvider → RootNavigator
    │
    ├─ isLoading || onboardingDone === null
    │       └─ ActivityIndicator (colors.gradientBottom bg)
    │
    ├─ onboardingDone = false
    │       └─ <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
    │               │
    │               ├─ Slide 1–4: Skip → currentSlide = 4 (flag YOK)
    │               ├─ Slide 1–4: Next → currentSlide++
    │               └─ Slide 5: CTA tapped
    │                       ├─ AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    │                       └─ onComplete() → RootNavigator re-renders
    │
    └─ onboardingDone = true
            ├─ token !== null → <AppNavigator />
            └─ token === null → <AuthNavigator />
```

---

## 8. App Icon ve Splash Screen (BL-031)

### 8.1 app.json Değişiklikleri

Mevcut `app.json`'da `splash.image` `./assets/splash-icon.png`'e ve `splash.backgroundColor` `#ffffff`'e işaret ediyor. Android adaptive icon alanları mevcut ama `foregroundImage` key adı yanlış kullanılmış (`android-icon-foreground.png`).

Gereken değişiklikler:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#05243E"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#05243E"
      }
    }
  }
}
```

**Not:** `backgroundImage` ve `monochromeImage` alanları Android adaptive icon'da desteklenir ancak Expo managed workflow'da `foregroundImage` + `backgroundColor` kombinasyonu yeterlidir. BL-031 kapsamı dışında kalan ek asset'ler silinmez; sadece `foregroundImage` ve `backgroundColor` güncellenir.

### 8.2 Renk Değeri

`splash.backgroundColor` ve `android.adaptiveIcon.backgroundColor` için kullanılan `#05243E` değeri, `tokens.ts`'deki `colors.gradientBottom` (`#0A1628`) ile **aynı değildir**. Spec açıkça `#05243E` yazmaktadır; bu değer `tokens.ts`'e `gradientBottom` token'ı olarak eklenmemiş olan ayrı bir renktir. `app.json` JSON formatında olduğundan token referansı kullanılamaz; sabit hex değer girilir: `"#05243E"`.

### 8.3 Asset Gereksinimleri

| Dosya | Boyut | Açıklama |
|-------|-------|---------|
| `assets/icon.png` | 1024x1024 | App icon (iOS + Android) |
| `assets/splash.png` | 1284x2778 önerilen (tam-ekran Expo) | Splash screen |
| `assets/adaptive-icon.png` | 1024x1024 | Android adaptive icon foreground |

**Mevcut durum:** `assets/icon.png` zaten var. `assets/splash-icon.png` var ancak `splash.png` adıyla değil. `android-icon-foreground.png` var ancak `adaptive-icon.png` adıyla değil.

### 8.4 Asset Oluşturma Stratejisi

Gerçek logo tasarımı bu sprint'in kapsamı dışındadır. Placeholder asset'lerin en pratik yolu:

**Seçenek A — Mevcut dosyaları kopyala/yeniden adlandır (Önerilen):**

```bash
cp mobile/assets/splash-icon.png mobile/assets/splash.png
cp mobile/assets/android-icon-foreground.png mobile/assets/adaptive-icon.png
```

Bu, `app.json` değişiklikleriyle uyumlu dosya adlarını sağlar. `icon.png` zaten mevcut.

**Seçenek B — Node.js script ile solid-color PNG üret:**

`sharp` paketi ile programatik olarak `#05243E` arka plan renkli 1024x1024 PNG oluşturulabilir:

```javascript
const sharp = require('sharp');
sharp({ create: { width: 1024, height: 1024, channels: 4,
  background: { r: 5, g: 36, b: 62, alpha: 1 } }})
  .png().toFile('mobile/assets/splash.png');
```

**Seçenek C — `expo-image-gen` CLI:**  
Expo ekosisteminde resmi bir `expo-image-gen` aracı yoktur. Bu seçenek pratik değildir.

**Mimarın önerisi:** Sprint 3 için Seçenek A yeterlidir. Gerçek varlıklar store submission sprint'inde (BL-033 kapsamında) tasarımcı tarafından üretilecektir.

### 8.5 Var Olan Android Asset'lerin Durumu

`app.json`'daki `backgroundImage` (`./assets/android-icon-background.png`) ve `monochromeImage` (`./assets/android-icon-monochrome.png`) alanları dosyaları zaten mevcut olduğundan kaldırılmamalıdır. Sadece `foregroundImage` ve `backgroundColor` güncellenir.

---

## 9. TypeScript Uyumu

`OnboardingScreen.tsx` içinde `useTranslation()` kullanımı `i18next` tip güvenliğine bağlıdır. Projede `react-i18next` kullanıldığı varsayılarak `t('onboarding.skip')` gibi çağrılar doğrudan çalışır. `npx tsc --noEmit` temiz geçmeli; bunu garantilemek için:

- `ONBOARDING_KEY` `cacheKeys.ts`'den import edilmeli, inline string kullanılmamalı.
- `onComplete` prop tipi açıkça `() => void` olarak tanımlanmalı.
- `currentSlide` tipi `number` (0–4); slayt 5 için `currentSlide === 4` kontrolü boolean olarak kullanılır.

---

## 10. Bağımlılık Notları

Bu özellik yeni bir npm paketi gerektirmez. Kullanılan tüm bağımlılıklar zaten kurulu:

| Bağımlılık | Kullanım |
|-----------|---------|
| `@react-native-async-storage/async-storage` | ONBOARDING_KEY okuma/yazma |
| `expo-linear-gradient` | Gradient arka plan |
| `@expo/vector-icons` (Ionicons) | Slayt ikonları |
| `react-i18next` | t() çevirileri |
| `react-navigation` | AuthNavigator navigasyonu |

---

## 11. Kapsam Dışı

Bu mimari belgede tasarlanmayan konular:

- Slayt geçiş animasyonları / parallax efektleri
- Onboarding sırasında kullanıcı tercihi toplama (bildirim izni, dil seçimi)
- Dark mode splash varyantları
- EAS Build yapılandırması (BL-033 kapsamında)
- Gerçek logo ve marka tasarımı

