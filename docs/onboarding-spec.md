# Feature Spec — BL-030 + BL-031: Onboarding Ekranı & App Icon / Splash Screen

**Version:** 1.0
**Date:** 2026-03-22
**Target Release:** v1.0.0 Sprint 3

---

## Overview

- **BL-030 — Onboarding:** Uygulamayı ilk kez açan kullanıcıya 5 slaytlık tanıtım akışı. Bir kez tamamlandıktan veya atlandıktan sonra AsyncStorage flag'i sayesinde bir daha gösterilmez. Son slayt doğrudan Auth ekranına bağlanır.
- **BL-031 — App Icon / Splash Screen:** Expo managed workflow için uygulama ikonu ve splash screen yapılandırması. Bu sprint placeholder varlıklarla altyapıyı kurar; gerçek logo tasarımı ertelenmiştir.

---

## User Stories

| ID | Story |
|----|-------|
| US-1 | İlk kez açan kullanıcı olarak, uygulamanın özelliklerini tanıtan kısa bir akış görmek istiyorum. |
| US-2 | İlk kez açan kullanıcı olarak, akışı istediğim zaman atlayabilmek istiyorum. |
| US-3 | Uygulamayı tekrar açan kullanıcı olarak, onboarding'in bir daha gösterilmemesini istiyorum. |
| US-4 | Onboarding'i tamamlayan kullanıcı olarak, son slayttaki butonlarla kayıt veya giriş ekranına geçmek istiyorum. |
| US-5 | Uygulamayı cihazına yükleyen kullanıcı olarak, ikonun ve splash screen'in uygulamanın renk kimliğini yansıtmasını istiyorum. |

---

## Slide İçerikleri

| # | Icon (Ionicons, size 120) | Başlık (TR) | Gövde (TR) |
|---|--------------------------|-------------|-----------|
| 1 | `checkmark-circle` | App adı | "Görevlerini yönet, hedeflerine ulaş" |
| 2 | `checkmark-done-circle-outline` | "Görevlerini Organize Et" | "Oluştur, önceliklendir ve sabitle. Her şey tek bir yerde." |
| 3 | `alarm-outline` | "Hiçbir Tarihi Kaçırma" | "Son tarih belirle, tam zamanında hatırlatıcı al." |
| 4 | `cloud-offline-outline` | "İnternetsiz de Çalışır" | "Bağlantın yokken de görev ekle. Bağlantı gelince otomatik senkronize olur." |
| 5 | — | — | CTA: "Hesap Oluştur" + "Giriş Yap" |

---

## i18n Keys

| Anahtar | Türkçe | İngilizce |
|---------|--------|-----------|
| `onboarding.slide1.tagline` | Görevlerini yönet, hedeflerine ulaş | Manage your tasks, reach your goals |
| `onboarding.slide2.headline` | Görevlerini Organize Et | Organize Your Tasks |
| `onboarding.slide2.body` | Oluştur, önceliklendir ve sabitle. Her şey tek bir yerde. | Create, prioritize and pin. Everything in one place. |
| `onboarding.slide3.headline` | Hiçbir Tarihi Kaçırma | Never Miss a Deadline |
| `onboarding.slide3.body` | Son tarih belirle, tam zamanında hatırlatıcı al. | Set a due date, get reminded right on time. |
| `onboarding.slide4.headline` | İnternetsiz de Çalışır | Works Offline Too |
| `onboarding.slide4.body` | Bağlantın yokken de görev ekle. Bağlantı gelince otomatik senkronize olur. | Add tasks without a connection. Auto-syncs when you're back online. |
| `onboarding.slide5.headline` | Hazır mısın? | Ready to Start? |
| `onboarding.cta.register` | Hesap Oluştur | Create Account |
| `onboarding.cta.login` | Giriş Yap | Sign In |
| `onboarding.skip` | Atla | Skip |
| `onboarding.next` | İleri | Next |

---

## Navigation Flow

```
App Launch
    │
    ▼
RootNavigator
  Reads @app:onboardingDone + token (parallel)
    │
    ├── onboardingDone = false ──▶ OnboardingScreen
    │                                   │
    │                          Slides 1–4: Skip / Next
    │                                   │
    │                          Slide 5: CTA buttons
    │                                   │
    │                    ┌──────────────┴──────────────┐
    │               "Hesap Oluştur"               "Giriş Yap"
    │                    │                             │
    │             flag saved                    flag saved
    │                    │                             │
    │             RegisterScreen               LoginScreen
    │
    └── onboardingDone = true ───▶ AuthNavigator (no token)
                                    or AppNavigator (has token)
```

**Flag write timing:** The `@app:onboardingDone = 'true'` flag is written only when a CTA button on slide 5 is tapped. The Skip button on slides 1–4 jumps to slide 5 but does NOT write the flag.

---

## Acceptance Criteria

### BL-030

- [ ] `@app:onboardingDone` not set → OnboardingScreen shown on launch
- [ ] `@app:onboardingDone = 'true'` set → OnboardingScreen skipped on launch
- [ ] Skip button (slides 1–4) navigates to slide 5; does NOT write flag
- [ ] Slide 5 "Hesap Oluştur" → writes flag → navigates to Register
- [ ] Slide 5 "Giriş Yap" → writes flag → navigates to Login
- [ ] Slide indicator: active pill ~33px wide, inactive ~18px, white, 9px gap
- [ ] Slide 5 has no Skip button and no Next arrow
- [ ] All strings use `t()` — no hard-coded Turkish or English
- [ ] `npx tsc --noEmit` exits clean

### BL-031

- [ ] `assets/icon.png` exists — 1024×1024, dark blue bg, white mark
- [ ] `assets/splash.png` exists — standard Expo splash size, dark blue bg
- [ ] `assets/adaptive-icon.png` exists — 1024×1024
- [ ] `app.json` `expo.icon` → `./assets/icon.png`
- [ ] `app.json` `expo.splash.image` → `./assets/splash.png`
- [ ] `app.json` `expo.splash.backgroundColor` → `#05243E`
- [ ] `app.json` `expo.android.adaptiveIcon.foregroundImage` → `./assets/adaptive-icon.png`
- [ ] All asset paths in `app.json` point to files that actually exist

---

## Out of Scope

- Real logo / brand design (deferred to store submission sprint)
- Slide animations / parallax
- Collecting user preferences during onboarding (notifications, language)
- Dark mode splash variants
- EAS Build / production build (BL-033)

---

## Design Notes

**Gradient:** Use project tokens `colors.gradientTop` / `colors.gradientBottom` (not raw hex values) for visual consistency with the rest of the app.

**Wireframe — Slides 1–4:**
```
┌─────────────────────────────┐
│  [Atla]                     │  ← top-left
│                             │
│       [ Ionicons 120 ]      │  ← centered, upper half
│                             │
│         Headline            │  ← white, bold, large
│      Body text here         │  ← white, medium
│                             │
│  ● ○ ○ ○ ○          [ → ]  │  ← bottom: pills + next arrow
└─────────────────────────────┘
```

**Wireframe — Slide 5:**
```
┌─────────────────────────────┐
│                             │
│     [ Hesap Oluştur ]       │  ← primary (filled)
│     [   Giriş Yap   ]       │  ← secondary (outline)
│                             │
│        ○ ○ ○ ○ ●           │  ← active: last pill
└─────────────────────────────┘
```
