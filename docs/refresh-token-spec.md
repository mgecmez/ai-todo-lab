# Feature Spec — BL-012: Refresh Token

**Version:** 1.0
**Date:** 2026-03-22
**Target Release:** v1.0.0 Sprint 4

---

## Problem

Current JWT access tokens expire after 7 days. When expired, the user is logged out and must re-authenticate manually. This is poor UX for a daily productivity app.

---

## Solution

Short-lived access tokens (15 minutes) + long-lived refresh tokens (30 days). The frontend intercepts 401 responses, silently refreshes the access token, and retries the original request — the user never notices.

---

## Acceptance Criteria

### Backend

- [ ] Access token lifetime: **15 minutes** (down from 7 days)
- [ ] Refresh token lifetime: **30 days**, stored **hashed** in DB
- [ ] `POST /api/auth/login` and `POST /api/auth/register` return both `accessToken` and `refreshToken`
- [ ] `POST /api/auth/refresh`: valid token → `200` + new `accessToken` + new `refreshToken`; invalid/expired/revoked → `401`
- [ ] Token rotation: old refresh token revoked on each use; reusing a revoked token returns `401`
- [ ] `POST /api/auth/logout`: revokes refresh token in DB, returns `204`
- [ ] Integration tests: refresh works, rotation enforced, expired token returns 401
- [ ] `dotnet test` — all existing tests pass

### Frontend

- [ ] Refresh token stored in `SecureStore` under key `auth_refresh_token`
- [ ] On `401` from any protected endpoint: call `POST /api/auth/refresh` → retry original request with new token
- [ ] If refresh fails → automatic logout → `LoginScreen`
- [ ] Concurrent `401`s queue behind a single in-flight refresh (no duplicate refresh calls)
- [ ] `logout` deletes refresh token from `SecureStore` and calls `POST /api/auth/logout`
- [ ] App startup restores both access token and refresh token from `SecureStore`
- [ ] `npx tsc --noEmit` — zero errors

---

## New Endpoints

### POST /api/auth/refresh
```
Body:    { "refreshToken": "<token>" }
200 OK:  { "accessToken": "...", "refreshToken": "..." }
401:     invalid / expired / revoked
```

### POST /api/auth/logout
```
Header: Authorization: Bearer <accessToken>
Body:   { "refreshToken": "<token>" }
204 No Content
```

---

## Delta from Current System

| Area | Current | Target |
|------|---------|--------|
| Access token lifetime | 7 days | 15 minutes |
| Refresh token | None | 30 days, hashed in DB |
| 401 behaviour | Immediate logout | Refresh → retry → logout on failure |
| Logout | Clear SecureStore only | Clear SecureStore + revoke in DB |
| Login/register response | `{ token, userId, email }` | `{ accessToken, refreshToken, userId, email }` |
| `AuthContext.login` signature | `(token, userId, email)` | `(accessToken, refreshToken, userId, email)` |

---

## Out of Scope

- Multiple device / session management
- Refresh token families / cascading revocation
- Proactive (pre-expiry) token refresh
- Password reset (BL-010), email verification (BL-011)

---

## Security Notes (for Architect)

- Refresh tokens stored **hashed** (SHA-256 or similar) — never plain text
- Rotation must be atomic: old token revoked before new one issued
- Expired and revoked tokens return identical `401` — no information leakage
- Refresh endpoint should be covered by existing rate limiting (BL-016)
