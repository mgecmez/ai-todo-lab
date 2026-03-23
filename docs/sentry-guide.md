# Sentry Developer Guide

This guide covers everything needed to configure Sentry for the AI Todo Lab mobile app
and verify that error reporting is working.

---

## 1. Prerequisites

| Requirement | Notes |
|-------------|-------|
| Sentry account | https://sentry.io/signup (free tier is sufficient) |
| EAS CLI ≥ 12 | `npm install -g eas-cli` |
| EAS Build configured | Sprint 5 (BL-033) must be complete |

---

## 2. Create a Sentry Project

1. Log in to https://sentry.io
2. **New Project → React Native**
3. Name it `ai-todo-lab` (or similar)
4. Copy the **DSN** — it looks like `https://abc123@o123.ingest.sentry.io/456`
5. Go to **Settings → Auth Tokens** and create a token with `project:write` scope
6. Note your **Organization slug** and **Project slug** from the project URL

---

## 3. EAS Secrets Setup

Run the following commands once per EAS project. These values are stored securely in EAS
and injected into builds — they are never committed to the repository.

```bash
# Required for all profiles (error ingestion)
eas secret:create --scope project --name SENTRY_DSN --value "https://xxx@yyy.ingest.sentry.io/zzz"

# Required for preview + production builds (source map upload)
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "your-auth-token"
eas secret:create --scope project --name SENTRY_ORG --value "your-org-slug"
eas secret:create --scope project --name SENTRY_PROJECT --value "ai-todo-lab"
```

To verify:
```bash
eas secret:list
```

---

## 4. Local Development Setup

Sentry is **disabled** (`enabled: false`) in the development profile to avoid noise.
No setup is required for local `npx expo start` workflows.

If you need to test Sentry locally (e.g., to verify DSN works), create
`mobile/.env.local` (already in `.gitignore`):

```
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
EAS_BUILD_PROFILE=preview
```

Then run:
```bash
npx expo start
```

> **Note:** `.env.local` is not automatically loaded by Expo. Pass it via your shell:
> `export $(cat .env.local | xargs) && npx expo start`

---

## 5. How Errors Are Captured

### Automatic (no code changes needed)
- Unhandled JavaScript exceptions
- Unhandled promise rejections
- Native crashes (iOS / Android) — available in EAS native builds only, not Expo Go

### Manual capture helpers

Located in `src/services/monitoring/sentry.ts`:

| Function | Where called | What it captures |
|----------|-------------|------------------|
| `captureAuthError(error, context)` | `authApi.ts` catch blocks | Login, register, refresh token failures |
| `captureOfflineSyncError(error, context)` | `queryClient.ts` MutationCache onError | Any TanStack Query mutation failure |

### User context
After login, `Sentry.setUser({ id, email })` is called in `AuthContext.tsx`. This attaches the user to all subsequent Sentry events so you can filter by user in the dashboard.

After logout, `Sentry.setUser(null)` clears the user context.

---

## 6. How to Trigger a Test Event

### Option A — From a preview build (recommended)

Add a temporary button to any screen for testing:

```typescript
import * as Sentry from '@sentry/react-native';

// In a component:
<Button title="Test Sentry" onPress={() => Sentry.captureException(new Error('Test event from preview build'))} />
```

Build and install a preview build, tap the button, check https://sentry.io within 30 seconds.

### Option B — Trigger a native crash (preview / production builds only)

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.nativeCrash(); // Immediately crashes the app — use with care
```

### Option C — Unhandled error

Throw an error in a component without a try/catch — it will be captured by Sentry's
default unhandled exception handler.

---

## 7. Reading a Stack Trace in the Dashboard

1. Open https://sentry.io → your project → **Issues**
2. Click an issue to open it
3. The **Stack Trace** section shows the source-mapped frames (human-readable file names + line numbers)
4. If frames still show minified code, check that source maps were uploaded:
   - **Settings → Source Maps** in the Sentry project
   - Re-run an EAS preview/production build to trigger upload

---

## 8. Adding a New Error Capture Point

To report errors from a new location:

```typescript
import { captureApiError } from '../services/monitoring/sentry';

try {
  // ... operation
} catch (error) {
  captureApiError(error, { endpoint: '/api/todos', method: 'POST', statusCode: 500 });
  throw error; // re-throw so the caller can handle it too
}
```

For auth-related errors use `captureAuthError`. For a completely new category, add a new
helper function to `src/services/monitoring/sentry.ts` following the same pattern.

---

## 9. PII and GDPR Notes

The user's **email address** is attached to Sentry events via `Sentry.setUser({ email })`.
This is considered personal data under GDPR.

To protect this data:
1. In the Sentry dashboard → **Settings → Security & Privacy → Data Scrubbing**
2. Add `email` to the list of scrubbed fields
3. Alternatively, omit `email` from `Sentry.setUser` and use only `id` if compliance
   is a concern

Passwords, JWT access tokens, and refresh tokens are **never** attached to Sentry events.
The helpers in `sentry.ts` do not log any request bodies.

---

## Quick Reference

```bash
# List EAS secrets
eas secret:list

# Trigger a preview build (with source maps + Sentry active)
eas build --profile preview --platform android

# Publish OTA update (Sentry enabled, no new native build)
eas update --branch preview --message "Fix: crash in TodoListScreen"
```
