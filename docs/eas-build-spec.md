# Feature Spec — BL-033: EAS Build / Development Build Geçişi

**Version:** 1.0
**Date:** 2026-03-22
**Target Release:** v1.0.0 Sprint 5

---

## Problem

The app runs only on Expo Go, which limits:
- Custom native modules beyond the Expo SDK
- Distribution to testers without Expo Go installed
- App Store / Play Store submission
- Production-grade build pipeline

## Solution

Migrate to EAS Build to produce real native binaries with three profiles: development (dev-client), preview (internal distribution), production (store).

---

## Acceptance Criteria

- [ ] `mobile/eas.json` with `development`, `preview`, `production` profiles
- [ ] `development`: `developmentClient: true`, `distribution: "internal"`
- [ ] `preview`: `distribution: "internal"`
- [ ] `production`: `distribution: "store"`
- [ ] `expo-dev-client` added to `package.json`
- [ ] `app.json`: `runtimeVersion: { "policy": "appVersion" }` added
- [ ] `app.json`: `updates.url` configured for EAS Update
- [ ] `npx expo install --check` — no mismatches
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `dotnet build` — still passes
- [ ] `docs/eas-build-guide.md` — step-by-step developer guide
- [ ] `npx expo start` still works (Expo Go flow not broken)

---

## Scope

### In Scope
- `mobile/eas.json` — three build profiles
- `mobile/app.json` — `runtimeVersion`, `updates`, `expo.extra.eas.projectId`
- `expo-dev-client` package
- `docs/eas-build-guide.md` — developer guide

### Out of Scope
- Apple Developer account / certificates
- App Store / Play Store submission
- TestFlight / Internal Testing distribution
- APNs push certificates
- GitHub Actions CI/CD integration
- Expo SDK version upgrade

---

## Dependencies

All existing native plugins (`expo-notifications`, `expo-secure-store`, `@react-native-community/datetimepicker`) are EAS Build compatible. `bundleIdentifier` and `package` are already set to `com.mgecmez.aitodolab` in `app.json`.

---

## Unlocks After This Sprint

BL-017 (Push Notifications), BL-032 (Sentry), BL-038 (Widget) — all require native builds that Expo Go cannot provide.
