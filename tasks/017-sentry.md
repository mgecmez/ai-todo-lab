# Sprint 6 — BL-032: Sentry Error Monitoring

**Date:** 2026-03-22
**Spec:** `docs/sentry-spec.md`
**Architecture:** `docs/sentry-architecture.md`

---

## SE-001 — `app.config.ts` tasarımı ve EAS secret yapısı belgele

**Owner:** Architect
**Deps:** —

`mobile/app.config.ts` yapısını kesinleştir: `app.json`'ı extend eder, `SENTRY_DSN`
env var'ını `extra.sentryDsn` olarak expose eder, `@sentry/react-native/expo` plugin'ini
ekler, `EAS_BUILD_PROFILE === preview/production` ise `authToken` geçer.
EAS secret listesini belgele: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

---

## SE-002 — `@sentry/react-native` paket kurulumu

**Owner:** Frontend
**Deps:** SE-001

`mobile/` dizininde `npx expo install @sentry/react-native` çalıştır.
`npx expo install --check` ile peer dependency uyumunu doğrula.

**Modifies:** `mobile/package.json`, `mobile/package-lock.json`

---

## SE-003 — `mobile/app.config.ts` oluştur

**Owner:** Frontend
**Deps:** SE-001, SE-002

Architect tasarımına göre `mobile/app.config.ts` oluştur. `app.json` içeriğini extend
eder, `extra.sentryDsn` ve `extra.easProfile` ekler, `@sentry/react-native/expo`
plugin'ini kayıt eder. `app.json` silinmez ve değiştirilmez.

**Creates:** `mobile/app.config.ts`

---

## SE-004 — `src/services/monitoring/sentry.ts` modülü oluştur

**Owner:** Frontend
**Deps:** SE-003

Dört named export: `initSentry()`, `captureApiError()`, `captureAuthError()`,
`captureOfflineSyncError()`. `initSentry()` içinde DSN `Constants.expoConfig?.extra?.sentryDsn`
den okunur; development profilinde `enabled: false`.

**Creates:** `mobile/src/services/monitoring/sentry.ts`

---

## SE-005 — `App.tsx`'e sentry.ts side-effect import ekle

**Owner:** Frontend
**Deps:** SE-004

`mobile/App.tsx` dosyasının en üst satırına tek satır ekle:
`import './src/services/monitoring/sentry';`

**Modifies:** `mobile/App.tsx`

---

## SE-006 — `AuthContext.tsx`'e Sentry kullanıcı etiketleme ekle

**Owner:** Frontend
**Deps:** SE-004

- `login()` sonunda: `Sentry.setUser({ id: userId, email })`
- `logout()` içinde: `Sentry.setUser(null)`
- `restoreSession()` içinde: restore başarılıysa `Sentry.setUser(...)`, session yoksa `Sentry.setUser(null)`

**Modifies:** `mobile/src/context/AuthContext.tsx`

---

## SE-007 — `authApi.ts`'e `captureAuthError` çağrıları ekle

**Owner:** Frontend
**Deps:** SE-004

`loginApi`, `registerApi`, `refreshTokenApi` catch bloklarına
`captureAuthError(error, { operation: 'login' | 'register' | 'refresh' })` ekle.
Hata kullanıcıya gösterilmeye devam eder; sadece ek olarak Sentry'ye raporlanır.

**Modifies:** `mobile/src/services/api/authApi.ts`

---

## SE-008 — `queryClient.ts`'e global MutationCache onError hook ekle

**Owner:** Frontend
**Deps:** SE-004

`QueryClient` konfigürasyonuna `MutationCache` ekle. `onError` callback'i her mutation
hatasında `captureOfflineSyncError` çağırsın (`mutationKey`, `failureCount` ile).
Mevcut `QueryCache` ve `defaultOptions` değiştirilmez.

**Modifies:** `mobile/src/query/queryClient.ts`

---

## SE-009 — `docs/sentry-guide.md` developer guide yaz

**Owner:** Frontend
**Deps:** SE-003, SE-004, SE-005, SE-006, SE-007, SE-008

Bölümler: EAS secret tanımlama (`eas secret:create` komutları), lokal `.env.local`
kullanımı, Sentry DSN nereden alınır, test event nasıl tetiklenir, PII / GDPR notu.

**Creates:** `docs/sentry-guide.md`

---

## SE-010 — Verification

**Owner:** Tester
**Deps:** SE-002 → SE-008

- `npx expo install --check` → no mismatches
- `npx tsc --noEmit` → zero errors
- `dotnet build` → success
- `dotnet test` → all pass (backend regresyon)

---

## Dependency Graph

```
SE-001
  └─ SE-002
       └─ SE-003
            └─ SE-004
                 ├─ SE-005
                 ├─ SE-006
                 ├─ SE-007
                 └─ SE-008
                      ├─ SE-009
                      └─ SE-010
```
