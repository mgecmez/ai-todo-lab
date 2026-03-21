# Task List: 016 — EAS Build / Development Build Migration

Source spec: `docs/eas-build-spec.md`
Architecture: `docs/eas-build-architecture.md`
Stack: Expo React Native · EAS CLI · expo-dev-client

---

## EB-001 — Create `mobile/eas.json` with three build profiles
**Owner:** Architect
**Deps:** none
**Estimate:** S

Create `mobile/eas.json` from scratch using the exact JSON structure defined in `docs/eas-build-architecture.md` Section 2. The file must contain `cli.version >= 12.0.0` and three profiles: `development` (developmentClient, internal, iOS simulator, Android APK), `preview` (internal, Android APK), `production` (store, Android AAB). No other files are modified by this ticket.

**Files created:** `mobile/eas.json`
**Files must NOT be modified:** `mobile/app.json`, `mobile/package.json`, `App.tsx`

---

## EB-002 — Update `mobile/app.json` — add `runtimeVersion`, `updates.url`, `extra.eas.projectId`
**Owner:** Architect
**Deps:** EB-001
**Estimate:** S

Add three fields to the existing `expo` object in `mobile/app.json` as specified in `docs/eas-build-architecture.md` Section 3: `runtimeVersion: { "policy": "appVersion" }`, `updates.url: "https://u.expo.dev/PLACEHOLDER_PROJECT_ID"`, and `extra.eas.projectId: "PLACEHOLDER_PROJECT_ID"`. All existing content in `app.json` must be preserved unchanged. Placeholder values remain until a developer runs `eas init`.

**Files modified:** `mobile/app.json`
**Files must NOT be modified:** `mobile/eas.json`, `mobile/package.json`, `App.tsx`

---

## EB-003 — Install `expo-dev-client` package
**Owner:** Frontend
**Deps:** EB-002
**Estimate:** S

Run `npx expo install expo-dev-client` from the `mobile/` directory to add the package at the SDK-compatible version (architecture doc Section 4 mandates `npx expo install` — not `npm install` or `yarn add`). No changes to `App.tsx` are required; managed workflow handles native integration automatically. Confirm `expo-dev-client` appears under `dependencies` in `package.json` after installation.

**Files modified:** `mobile/package.json`, `mobile/package-lock.json`
**Files must NOT be modified:** `mobile/eas.json`, `mobile/app.json`, `App.tsx`

---

## EB-004 — Write `docs/eas-build-guide.md` developer guide
**Owner:** Frontend
**Deps:** EB-003
**Estimate:** M

Create `docs/eas-build-guide.md` following the seven-section structure mandated in `docs/eas-build-architecture.md` Section 8. Sections in order: (1) Prerequisites with minimum versions, (2) First-time setup — `eas login`, `eas init`, placeholder verification, `--check`, (3) Local dev build commands for iOS Simulator and Android, (4) Cloud build command table for all profile/platform combinations, (5) Preview build install via QR and direct download, (6) OTA update with `eas update`, branch concept, and runtimeVersion compatibility warning, (7) Troubleshooting — five named scenarios from the architecture doc.

**Files created:** `docs/eas-build-guide.md`
**Files must NOT be modified:** `mobile/eas.json`, `mobile/app.json`, `mobile/package.json`

---

## EB-005 — Verification — build, type-check, and runtime smoke test
**Owner:** Tester
**Deps:** EB-004
**Estimate:** S

Run the full verification suite defined in `docs/eas-build-spec.md` acceptance criteria and `docs/eas-build-architecture.md` Section 10. All five checks must pass: `npx expo install --check` (no version mismatches), `npx tsc --noEmit` (zero TypeScript errors), `dotnet build` (exits 0), `dotnet test` (all tests pass), `npx expo start` (server starts without error, confirming Expo Go flow is not broken). Record the output of each command in the verification report.

**Files must NOT be modified:** any source file — this is a read-only verification ticket

---

## Summary Table

| Ticket | Owner    | Title                                              | Est. | Dependency |
|--------|----------|----------------------------------------------------|------|------------|
| EB-001 | Architect | Create `mobile/eas.json` with three build profiles | S    | none       |
| EB-002 | Architect | Update `mobile/app.json` — runtimeVersion + updates + projectId | S | EB-001 |
| EB-003 | Frontend  | Install `expo-dev-client` package                  | S    | EB-002     |
| EB-004 | Frontend  | Write `docs/eas-build-guide.md` developer guide    | M    | EB-003     |
| EB-005 | Tester    | Verification — build, type-check, runtime smoke test | S  | EB-004     |

## Dependency Order

EB-001 → EB-002 → EB-003 → EB-004 → EB-005
