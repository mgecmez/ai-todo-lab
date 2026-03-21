# Task List: 014 — Onboarding Ekranı & App Icon / Splash Screen

Source spec: `docs/onboarding-spec.md`
Architecture: `docs/onboarding-architecture.md`
Backlog items: BL-030 (Onboarding), BL-031 (App Icon / Splash Screen)
Stack: Expo React Native · TypeScript · AsyncStorage · expo-linear-gradient · react-i18next

---

## OB-001 — Add ONBOARDING_KEY to cacheKeys.ts
**Owner:** architect
**Deps:** none
**Estimate:** S

`mobile/src/services/cache/cacheKeys.ts` dosyasına `export const ONBOARDING_KEY = '@app:onboarding:done';` satırı eklenir. Bu anahtar mevcut `@app:language` namespace kuralına uygun olarak tanımlanmıştır ve Frontend Dev tarafından bu değer birebir kullanılmalıdır.

**Modifies:** `mobile/src/services/cache/cacheKeys.ts`
**Must NOT modify:** `mobile/src/services/cache/storage.ts`, `mobile/src/services/cache/todosCacheService.ts`

---

## OB-002 — Add `onboarding.*` keys to tr.json and en.json
**Owner:** architect
**Deps:** none
**Estimate:** S

`mobile/src/i18n/locales/tr.json` ve `mobile/src/i18n/locales/en.json` dosyalarına spec tablosundaki 12 i18n anahtarının tamamını içeren üst düzey `"onboarding"` bloğu eklenir. Blok yapısı: `slide1.tagline`, `slide2.headline`, `slide2.body`, `slide3.headline`, `slide3.body`, `slide4.headline`, `slide4.body`, `slide5.headline`, `cta.register`, `cta.login`, `skip`, `next`.

**Modifies:** `mobile/src/i18n/locales/tr.json`, `mobile/src/i18n/locales/en.json`
**Must NOT modify:** diğer i18n locale dosyaları, i18n konfigürasyon dosyası

---

## OB-003 — Configure app.json icon/splash fields and verify asset paths
**Owner:** frontend
**Deps:** none
**Estimate:** S

`mobile/app.json` içindeki `expo.icon`, `expo.splash.image`, `expo.splash.backgroundColor`, `expo.android.adaptiveIcon.foregroundImage` ve `expo.android.adaptiveIcon.backgroundColor` alanları architecture doc Bölüm 8.1'deki değerlere göre güncellenir. `assets/splash.png` ve `assets/adaptive-icon.png` dosyaları mevcut değilse architecture doc Seçenek A'ya göre (`cp splash-icon.png splash.png`, `cp android-icon-foreground.png adaptive-icon.png`) oluşturulur. Tüm `app.json` asset path'lerinin gerçekten var olan dosyalara işaret ettiği doğrulanır.

**Modifies:** `mobile/app.json`
**May create:** `mobile/assets/splash.png`, `mobile/assets/adaptive-icon.png`
**Must NOT modify:** `mobile/assets/icon.png`, `mobile/assets/android-icon-background.png`, `mobile/assets/android-icon-monochrome.png`

---

## OB-004 — Update RootNavigator to read onboardingDone flag from AsyncStorage
**Owner:** frontend
**Deps:** OB-001
**Estimate:** M

`mobile/src/navigation/RootNavigator.tsx` dosyasına `onboardingDone` state (`boolean | null`, başlangıç: `null`) ve bunu dolduran `useEffect` eklenir. `useEffect` mount sırasında `AsyncStorage.getItem(ONBOARDING_KEY)` çağırır ve değeri `value === 'true'` boolean'ına dönüştürerek state'e yazar. Loading koşulu `isLoading || onboardingDone === null` olarak güncellenir. Render kararı architecture doc Bölüm 2.3'teki yapıya göre uygulanır: `onboardingDone` false ise `<OnboardingScreen onComplete={() => setOnboardingDone(true)} />`, true ise mevcut `token` kontrolüne devam edilir.

**Modifies:** `mobile/src/navigation/RootNavigator.tsx`
**Must NOT modify:** `mobile/src/navigation/types.ts`, `AuthContext`

---

## OB-005 — Implement OnboardingScreen — slides 1–4
**Owner:** frontend
**Deps:** OB-001, OB-002
**Estimate:** L

`mobile/src/screens/OnboardingScreen.tsx` dosyası oluşturulur. Slayt yönetimi `useState(currentSlide: number)` ile yapılır (FlatList/swipe kullanılmaz). Slayt verisi architecture doc Bölüm 3.2'deki `SLIDES: SlideData[]` dizisi ile tanımlanır. Slayt 1–4 layout'u: sol üstte "Atla" butonu, ortada Ionicons ikonu (120px), başlık, gövde metni, altta pill göstergeler + sağda ok butonu. Gradient arka plan `expo-linear-gradient` ve `gradient.screen` token'ı ile uygulanır. Pill göstergesi architecture doc Bölüm 3.5'teki boyutlara (aktif 33px, pasif 18px, boşluk 9px) ve `colors.textOnDark` token'ına göre stillendirilir. Tüm metin içerikleri `t()` ile sağlanır; hardcoded Türkçe/İngilizce string yasaktır. Skip butonu `currentSlide = 4`'e atlar, flag yazmaz.

**Creates:** `mobile/src/screens/OnboardingScreen.tsx`
**Must NOT modify:** `RootNavigator.tsx`, `types.ts`

---

## OB-006 — Implement slide 5 (Get Started) — CTA buttons and flag write
**Owner:** frontend
**Deps:** OB-005
**Estimate:** S

OB-005'te oluşturulan `OnboardingScreen.tsx` içindeki slayt 5 (`currentSlide === 4`) render dalı tamamlanır. Slayt 5 layout'u: Skip ve Next butonları yoktur; sadece "Hesap Oluştur" (primary, dolu) ve "Giriş Yap" (secondary, outline) CTA butonları ve alt ortada aktif son pill göstergesi bulunur. Her iki CTA tıklandığında `AsyncStorage.setItem(ONBOARDING_KEY, 'true')` yazılır, ardından `onComplete()` çağrılır. Stil: "Hesap Oluştur" için `colors.authButtonBg`, "Giriş Yap" için `borderWidth: 1, borderColor: colors.textOnDark, backgroundColor: 'transparent'`.

**Modifies:** `mobile/src/screens/OnboardingScreen.tsx`
**Must NOT modify:** `RootNavigator.tsx`, `cacheKeys.ts`

---

## OB-007 — Wire OnboardingScreen into navigation — TypeScript clean
**Owner:** frontend
**Deps:** OB-004, OB-006
**Estimate:** S

`OnboardingScreen`'in `Props` tipi `{ onComplete: () => void }` olarak açıkça tanımlanır. `RootNavigator.tsx`'te OB-004'te eklenen render dalının `<OnboardingScreen onComplete={...} />` prop geçişiyle TypeScript hataları olmadan derlendiği doğrulanır. `npx tsc --noEmit` çalıştırılır; sıfır hata beklenir. `ONBOARDING_KEY` her yerde `cacheKeys.ts` import'undan gelir, inline string kullanılmaz.

**Modifies:** `mobile/src/screens/OnboardingScreen.tsx`, `mobile/src/navigation/RootNavigator.tsx`
**Must NOT modify:** `mobile/src/navigation/types.ts`

---

## OB-008 — TypeScript clean check and manual smoke test checklist
**Owner:** test
**Deps:** OB-003, OB-007
**Estimate:** S

`npx tsc --noEmit` çalıştırılır ve sıfır hata doğrulanır. Ardından aşağıdaki manuel smoke test senaryoları fiziksel cihaz veya simülatörde yürütülür ve sonuçlar raporlanır.

**Test senaryoları:**
1. `AsyncStorage`'da `@app:onboarding:done` yokken uygulama açılır → OnboardingScreen slayt 1 görünür.
2. Slayt 1–4'te "Atla" tıklanır → slayt 5'e atlar, flag yazılmaz, uygulama tekrar başlatıldığında onboarding yeniden gösterilir.
3. Slayt 1–4'te "İleri" tıklanır → sırayla slayt 2, 3, 4, 5'e geçilir.
4. Slayt 5'te "Hesap Oluştur" tıklanır → flag yazılır, AuthNavigator/Register gösterilir.
5. Slayt 5'te "Giriş Yap" tıklanır → flag yazılır, AuthNavigator/Login gösterilir.
6. Flag yazıldıktan sonra uygulama yeniden başlatılır → OnboardingScreen gösterilmez, doğrudan Auth/App akışı açılır.
7. `app.json`'daki tüm asset path'leri gerçek dosyalara işaret eder (`assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png` mevcuttur).
8. Pill göstergesi: aktif slayta karşılık gelen pill genişletilmiş, diğerleri küçük ve yarı saydam görünür.
9. Slayt 5'te Skip ve Next butonları görünmez.

**Produces:** test sonuç raporu veya geçen/başarısız madde listesi
**Must NOT modify:** herhangi bir kaynak dosya

---

## Summary Table

| Ticket | Owner    | Title                                                        | Est. | Dependency       |
|--------|----------|--------------------------------------------------------------|------|------------------|
| OB-001 | architect | Add ONBOARDING_KEY to cacheKeys.ts                          | S    | none             |
| OB-002 | architect | Add `onboarding.*` keys to tr.json and en.json              | S    | none             |
| OB-003 | frontend  | Configure app.json icon/splash fields + verify asset paths  | S    | none             |
| OB-004 | frontend  | Update RootNavigator to read onboardingDone from AsyncStorage| M   | OB-001           |
| OB-005 | frontend  | Implement OnboardingScreen — slides 1–4                     | L    | OB-001, OB-002   |
| OB-006 | frontend  | Implement slide 5 (Get Started) — CTA buttons, flag write   | S    | OB-005           |
| OB-007 | frontend  | Wire OnboardingScreen into navigation — TypeScript clean    | S    | OB-004, OB-006   |
| OB-008 | test      | TypeScript clean check + manual smoke test checklist        | S    | OB-003, OB-007   |

---

## Dependency Order

```
OB-001 ──┬──▶ OB-004 ──┐
          │              ├──▶ OB-007 ──▶ OB-008
OB-002 ──┼──▶ OB-005 ──▶ OB-006 ──┘
          │
OB-003 ──┘──────────────────────────────▶ OB-008
```

Paralel başlangıç: OB-001, OB-002, OB-003 birbirinden bağımsız olarak eş zamanlı başlatılabilir.
OB-004 ve OB-005 da birbirinden bağımsızdır; yalnızca OB-001 ve OB-002 tamamlanmasına sırasıyla bağlıdır.
