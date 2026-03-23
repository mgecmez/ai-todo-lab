# Feature Spec — BL-032: Sentry Error Monitoring

**Version:** 1.0
**Date:** 2026-03-22
**Target Release:** v1.0.0 Sprint 6

---

## Problem

The app is approaching store release (v1.0.0). Once distributed to real users via EAS
Build profiles, unhandled exceptions, API failures, and native crashes become invisible —
there is no way to detect or diagnose them without user-reported feedback. TanStack Query
retries and offline-queue mutations can also fail silently in edge cases that are hard to
reproduce in development. The team needs structured, real-time error visibility in preview
and production environments.

---

## Solution

Integrate Sentry into the React Native (Expo) mobile app using `@sentry/react-native`
and its official Expo config plugin. Sentry will capture:

- Unhandled JavaScript exceptions
- Unhandled promise rejections
- Native crashes (iOS / Android)
- Manually reported errors in critical flows (auth, API mutations, offline sync)

DSN and environment configuration are managed via `app.config.ts` using `extra` fields,
keeping secrets out of source code. Error reporting is active only on `preview` and
`production` EAS Build profiles; disabled in `development` to avoid noise.

---

## Acceptance Criteria

### SDK Setup
- [ ] `@sentry/react-native` added to `mobile/package.json`
- [ ] `@sentry/react-native/expo` config plugin registered in `app.config.ts`
- [ ] `npx expo install --check` — no dependency mismatches
- [ ] `npx tsc --noEmit` — zero TypeScript errors

### Initialization
- [ ] `Sentry.init()` called at app startup before the root navigator mounts
- [ ] DSN read from `Constants.expoConfig?.extra?.sentryDsn`; never hardcoded in source
- [ ] `enabled: false` in `development` profile; active in `preview` and `production`
- [ ] `release` set to app version string (`"aitodolab@<version>"`)
- [ ] `environment` set to EAS Build profile (`"preview"` / `"production"`)

### Error Capture — Automatic
- [ ] Unhandled JS exception causes a Sentry event (verified manually on preview build)
- [ ] Unhandled promise rejections are captured

### Error Capture — Manual
- [ ] Auth failures (login, register, refresh token) reported via `captureAuthError()`
- [ ] Offline mutation sync failures reported via `captureOfflineSyncError()` through global `MutationCache` `onError`
- [ ] No sensitive data (passwords, JWT tokens, refresh tokens) attached to any Sentry event

### User Context
- [ ] `Sentry.setUser({ id, email })` called after successful login and session restore
- [ ] `Sentry.setUser(null)` called on logout

### Source Maps
- [ ] Source maps uploaded to Sentry during EAS `preview` and `production` builds
- [ ] `SENTRY_AUTH_TOKEN` stored as EAS secret — never committed to repo

### Documentation
- [ ] `docs/sentry-guide.md` — DSN setup, EAS secret config, how to trigger a test event, PII notes

---

## Scope

### In Scope
- `@sentry/react-native` integration (mobile only)
- `app.config.ts` — dynamic Expo config extending `app.json`
- `src/services/monitoring/sentry.ts` — init + manual capture helpers
- User context binding (`Sentry.setUser`) in `AuthContext.tsx`
- Auth error capture in `authApi.ts`
- Global mutation error capture in `queryClient.ts`
- Source map upload via EAS Build
- `docs/sentry-guide.md` developer guide

### Out of Scope
- Backend (.NET API) Sentry integration
- Sentry Performance Monitoring / Tracing
- Sentry Session Replay
- Sentry Alerts / notification rules (configured in Sentry dashboard)
- Error boundary fallback UI screens

---

## Dependencies

- **Requires (completed):** BL-033 — EAS Build migration. `eas.json` and build profiles must exist.
- **Note:** `sentry-expo` package is deprecated as of Expo SDK 51 and must NOT be used. Use `@sentry/react-native` directly with its built-in Expo plugin.
