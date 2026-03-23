# Architecture — BL-032: Sentry Error Monitoring

**Version:** 1.0
**Date:** 2026-03-22
**Scope:** Mobile only (`mobile/`)

---

## 1. Package Decision

**Use `@sentry/react-native` directly. Do NOT use `sentry-expo`.**

`sentry-expo` is deprecated (last updated for Expo SDK 51, Q1 2024) and incompatible
with Expo SDK 55. `@sentry/react-native` ships its own Expo config plugin:

```json
["@sentry/react-native/expo", { "organization": "...", "project": "..." }]
```

This plugin injects `sentry-cli upload-sourcemaps` into EAS Build hooks automatically.

---

## 2. `app.json` → `app.config.ts` Migration

`app.json` is NOT deleted. `app.config.ts` is created alongside it; Expo reads
`app.config.ts` first and uses `app.json` as the base config via `config` in the
`ConfigContext` argument.

```
app.json          ← static base (unchanged)
app.config.ts     ← dynamic layer (reads env vars, adds Sentry plugin)
```

**`app.config.ts` responsibilities:**
1. Spread `config` (everything in `app.json`)
2. Append `@sentry/react-native/expo` to `plugins`
3. Inject `extra.sentryDsn` from `process.env.SENTRY_DSN`
4. Inject `extra.easProfile` from `process.env.EAS_BUILD_PROFILE` (auto-set by EAS)
5. Pass `authToken` to plugin only when `uploadSourceMaps` is true

```typescript
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const profile = process.env.EAS_BUILD_PROFILE ?? 'development';
  const sentryDsn = process.env.SENTRY_DSN ?? '';
  const uploadSourceMaps = profile === 'preview' || profile === 'production';

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        '@sentry/react-native/expo',
        {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: uploadSourceMaps ? process.env.SENTRY_AUTH_TOKEN : undefined,
        },
      ],
    ],
    extra: {
      ...config.extra,
      sentryDsn,
      easProfile: profile,
    },
  };
};
```

DSN is accessed at runtime via `expo-constants`:
```typescript
import Constants from 'expo-constants';
const dsn = Constants.expoConfig?.extra?.sentryDsn ?? '';
```

---

## 3. Sentry Init Location

**Decision: separate module `src/services/monitoring/sentry.ts`, side-effect imported in `App.tsx`.**

| Option | Pro | Con |
|--------|-----|-----|
| Inline in `App.tsx` | Simple | `App.tsx` grows; harder to mock |
| Separate module (chosen) | Isolated, testable, single responsibility | Extra file |

`App.tsx` top line:
```typescript
import './src/services/monitoring/sentry';
```

Sentry init runs synchronously at module load time — before React tree mounts, before
navigation, before QueryClient. This ensures errors during startup are captured.

**Do NOT use `useEffect` for Sentry init.** Errors that occur during the first render
before `useEffect` runs would be missed.

---

## 4. Error Capture Architecture

Two-layer approach:

### Layer 1 — `src/services/monitoring/sentry.ts` helpers

Named exports wrapping `Sentry.captureException`:

```typescript
export function captureApiError(error: unknown, context: {
  endpoint: string;
  method: string;
  statusCode?: number;
}): void

export function captureAuthError(error: unknown, context: {
  operation: 'login' | 'register' | 'refresh' | 'logout';
  userId?: string;
}): void

export function captureOfflineSyncError(error: unknown, context: {
  mutationKey: string;
  failureCount: number;
}): void
```

When `enabled: false`, the Sentry SDK turns all calls into no-ops — no additional
`enabled` check needed inside these helpers.

### Layer 2 — Call sites

| Where | Function | Trigger |
|-------|----------|---------|
| `authApi.ts` catch blocks | `captureAuthError` | login / register / refresh failure |
| `queryClient.ts` MutationCache onError | `captureOfflineSyncError` | any mutation failure |
| `AuthContext.tsx` | `Sentry.setUser` (direct import) | login / logout / restore session |

**Mutation error capture** uses a global `MutationCache` `onError` hook, NOT individual
mutation `onError` callbacks. This avoids touching every mutation file:

```typescript
import { MutationCache, QueryClient } from '@tanstack/react-query';
import { captureOfflineSyncError } from '../services/monitoring/sentry';

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      captureOfflineSyncError(error, {
        mutationKey: JSON.stringify(mutation.options.mutationKey ?? 'unknown'),
        failureCount: mutation.state.failureCount,
      });
    },
  }),
  // ... existing defaultOptions
});
```

---

## 5. User Context

`AuthContext.tsx` is modified at three points:

```typescript
import * as Sentry from '@sentry/react-native';

// After login:
Sentry.setUser({ id: userId, email });

// After logout:
Sentry.setUser(null);

// After session restore:
if (storedToken) {
  Sentry.setUser({ id: storedUserId, email: storedEmail });
} else {
  Sentry.setUser(null);
}
```

**PII note:** Email is attached to Sentry events. Configure Sentry "Data Scrubbing" in
the dashboard to mask emails if GDPR compliance is required. See `docs/sentry-guide.md`.

---

## 6. Source Map Upload

The `@sentry/react-native/expo` plugin auto-injects `sentry-cli upload-sourcemaps` into
the EAS Build post-build hook when `authToken` is provided.

- `authToken` is passed only when `uploadSourceMaps === true` (preview + production)
- In `development` profile: plugin registered but `authToken` is `undefined` → no upload

---

## 7. EAS Secrets

Set via `eas secret:create --scope project --name <NAME> --value <VALUE>`:

| Secret | Purpose | Profiles |
|--------|---------|---------|
| `SENTRY_DSN` | Sentry data source name for event ingestion | All |
| `SENTRY_AUTH_TOKEN` | `sentry-cli` source map upload auth | preview, production |
| `SENTRY_ORG` | Sentry organization slug | preview, production |
| `SENTRY_PROJECT` | Sentry project slug | preview, production |

For local development, create `mobile/.env.local` (gitignored):
```
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
EAS_BUILD_PROFILE=development
```

---

## 8. Files Changed

| File | Action | Notes |
|------|--------|-------|
| `mobile/app.config.ts` | Create | Dynamic Expo config; extends `app.json` |
| `mobile/src/services/monitoring/sentry.ts` | Create | `initSentry()` + capture helpers |
| `mobile/App.tsx` | Modify | Add side-effect import (1 line) |
| `mobile/src/context/AuthContext.tsx` | Modify | `Sentry.setUser` at login/logout/restore |
| `mobile/src/services/api/authApi.ts` | Modify | `captureAuthError` in catch blocks |
| `mobile/src/query/queryClient.ts` | Modify | Add `MutationCache` with `onError` |
| `mobile/package.json` | Modify | `@sentry/react-native` via `npx expo install` |
| `docs/sentry-guide.md` | Create | Developer guide |
| `docs/sentry-spec.md` | Create | Feature spec |

`mobile/app.json` is NOT modified.

---

## 9. No Backend Changes

`ITodoRepository`, `.NET API`, and all backend files are untouched.
`AuthContextValue` public interface is unchanged (same `login`, `logout` signatures).
