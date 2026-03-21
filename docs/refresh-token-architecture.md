# Architecture: Refresh Token (BL-012)

**Version:** 1.0  
**Date:** 2026-03-22  
**Target Release:** v1.0.0 Sprint 4  
**Spec:** `docs/refresh-token-spec.md`  
**Author:** Architect

---

## 1. Overview

The current system issues a single JWT with a 7-day lifetime. When it expires the user must log in again. This release introduces a two-token scheme: a short-lived **access token** (15 minutes) and a long-lived **refresh token** (30 days). The access token is a standard JWT validated in memory; the refresh token is an opaque random value stored hashed in the database. The frontend intercepts 401 responses, silently obtains a new token pair, and retries the failed request — the user never notices expiry under normal usage.

### Token Lifetime Summary

| Token | Lifetime | Storage | Transport |
|-------|----------|---------|-----------|
| Access token | 15 minutes | SecureStore (`auth_token`) | `Authorization: Bearer` header |
| Refresh token | 30 days | DB (hashed) + SecureStore (`auth_refresh_token`) | Request body only |

---

## 2. Breaking Changes

This feature introduces a **breaking change** to the `AuthResponse` DTO: the `Token` field is renamed to `AccessToken` and a new `RefreshToken` field is added. The `AuthContext.login` signature changes accordingly. Any client code referencing the old field name must be updated in the same sprint.

The `Jwt:ExpiryDays` configuration key is renamed to `Jwt:AccessTokenExpiryMinutes` with a new unit (minutes, not days).

---

## 3. Backend

### 3.1 New Entity — `RefreshToken`

**File:** `backend/TodoApp.Api/Models/RefreshToken.cs`

```csharp
namespace TodoApp.Api.Models;

public class RefreshToken
{
    public Guid Id { get; set; }

    /// SHA-256 hex digest of the raw token. Never store the raw value.
    public string TokenHash { get; set; } = string.Empty;

    public Guid UserId { get; set; }

    public DateTime ExpiresAt { get; set; }   // UTC

    /// Null = active. Set on rotation or logout.
    public DateTime? RevokedAt { get; set; }  // UTC

    public DateTime CreatedAt { get; set; }   // UTC

    // Navigation
    public User User { get; set; } = null!;
}
```

`IsActive` is a computed property for service layer convenience:

```csharp
public bool IsActive => RevokedAt is null && ExpiresAt > DateTime.UtcNow;
```

---

### 3.2 AppDbContext Changes

**File:** `backend/TodoApp.Api/Data/AppDbContext.cs`

Add to the class body:

```csharp
public DbSet<RefreshToken> RefreshTokens { get; set; }
```

Add inside `OnModelCreating`, after the `User` entity block:

```csharp
modelBuilder.Entity<RefreshToken>(entity =>
{
    entity.HasKey(rt => rt.Id);

    entity.Property(rt => rt.TokenHash)
          .IsRequired()
          .HasMaxLength(64); // SHA-256 hex = 64 chars

    entity.HasIndex(rt => rt.TokenHash)
          .IsUnique()
          .HasDatabaseName("IX_RefreshTokens_TokenHash");

    entity.Property(rt => rt.ExpiresAt).IsRequired();
    entity.Property(rt => rt.CreatedAt).IsRequired();
    entity.Property(rt => rt.RevokedAt); // nullable

    entity.HasOne(rt => rt.User)
          .WithMany()
          .HasForeignKey(rt => rt.UserId)
          .OnDelete(DeleteBehavior.Cascade);
});
```

The unique index on `TokenHash` is the primary lookup path for the refresh and logout endpoints. Cascade delete ensures refresh tokens are cleaned up when a user account is hard-deleted (soft delete already filters them out via the `User` query filter; the `RefreshToken` entity does not need its own soft-delete filter).

---

### 3.3 EF Core Migration

**Migration name:** `AddRefreshToken`

Generate via:

```bash
cd backend/TodoApp.Api
dotnet ef migrations add AddRefreshToken
```

The migration creates the `RefreshTokens` table and the `IX_RefreshTokens_TokenHash` unique index. No existing data is affected. Auto-migration in `Program.cs` (`dbContext.Database.Migrate()`) applies it on startup.

---

### 3.4 Configuration — appsettings.json

**File:** `backend/TodoApp.Api/appsettings.json`

Replace the current `Jwt` section:

```json
"Jwt": {
  "Secret": "CHANGE_ME_IN_PRODUCTION_USE_STRONG_32_CHAR_KEY",
  "Issuer": "TodoApp",
  "Audience": "TodoApp",
  "AccessTokenExpiryMinutes": 15,
  "RefreshTokenExpiryDays": 30
}
```

The key `ExpiryDays` (7 days, used in `UserService.GenerateJwt`) is removed. Every call site that reads `Jwt:ExpiryDays` must be updated to `Jwt:AccessTokenExpiryMinutes`.

`appsettings.Development.json` (if it overrides `ExpiryDays`) must also be updated.

---

### 3.5 New DTO — `RefreshRequest`

**File:** `backend/TodoApp.Api/DTOs/Auth/RefreshRequest.cs`

```csharp
using System.ComponentModel.DataAnnotations;

namespace TodoApp.Api.DTOs.Auth;

public class RefreshRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
```

---

### 3.6 Updated DTO — `AuthResponse`

**File:** `backend/TodoApp.Api/DTOs/Auth/AuthResponse.cs`

```csharp
namespace TodoApp.Api.DTOs.Auth;

public class AuthResponse
{
    public string AccessToken  { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public string UserId       { get; set; } = string.Empty;
    public string Email        { get; set; } = string.Empty;
}
```

The field `Token` is renamed to `AccessToken`. This is a **breaking change**: all callers of `RegisterAsync` and `LoginAsync` in `UserService`, as well as the frontend, must be updated simultaneously.

---

### 3.7 IUserService Additions

**File:** `backend/TodoApp.Api/Services/IUserService.cs`

Add the following three method signatures to the interface:

```csharp
Task<AuthResponse?> RefreshAsync(string rawRefreshToken);
Task RevokeRefreshTokenAsync(string rawRefreshToken);
```

The existing `LoginAsync` and `RegisterAsync` signatures do not change; their return type `AuthResponse` now includes the new `RefreshToken` field.

---

### 3.8 UserService Implementation Details

**File:** `backend/TodoApp.Api/Services/UserService.cs`

#### Token hashing

All refresh token values are hashed before touching the database. The implementation must use:

```csharp
private static string HashToken(string rawToken)
{
    var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
    return Convert.ToHexString(bytes).ToLowerInvariant(); // 64-char hex
}
```

Raw tokens are **never** written to the database or logged.

#### Raw token generation

```csharp
private static string GenerateRawRefreshToken()
    => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
```

This produces 88 characters of Base64 (64 random bytes), providing 512 bits of entropy.

#### `RegisterAsync` and `LoginAsync` changes

Both methods must:

1. Generate a raw refresh token via `GenerateRawRefreshToken()`.
2. Persist a `RefreshToken` entity with `TokenHash = HashToken(rawToken)`, `UserId`, `ExpiresAt = DateTime.UtcNow.AddDays(refreshExpiryDays)`, `CreatedAt = DateTime.UtcNow`.
3. Return `AuthResponse` with both `AccessToken` (from the existing `GenerateJwt`) and `RefreshToken` (the raw, unhashed value — sent to the client once and never stored again).

`GenerateJwt` must be updated to read `Jwt:AccessTokenExpiryMinutes` (integer, minutes) instead of `Jwt:ExpiryDays`:

```csharp
var expMinutes = int.Parse(configuration["Jwt:AccessTokenExpiryMinutes"] ?? "15");
// ...
expires: DateTime.UtcNow.AddMinutes(expMinutes),
```

#### `RefreshAsync(string rawRefreshToken)`

Token rotation must be atomic. The steps are:

1. Hash the incoming token: `var hash = HashToken(rawRefreshToken)`.
2. Query `RefreshTokens` where `TokenHash == hash`, include `User`. If not found → return `null`.
3. If `!token.IsActive` (expired or revoked) → return `null`.
4. Mark old token revoked: `token.RevokedAt = DateTime.UtcNow`.
5. Generate new raw refresh token and persist new `RefreshToken` entity for the same `UserId`.
6. Generate new access token via `GenerateJwt(token.User)`.
7. Save all changes in a single `SaveChangesAsync` call.
8. Return `AuthResponse` with the new token pair.

Steps 4–7 must be wrapped in a single database transaction to prevent a partial-revoke state if the save fails.

#### `RevokeRefreshTokenAsync(string rawRefreshToken)`

1. Hash the incoming token.
2. Query `RefreshTokens` by `TokenHash`. If not found or already revoked → no-op (idempotent).
3. Set `RevokedAt = DateTime.UtcNow`.
4. `SaveChangesAsync`.

---

### 3.9 IRefreshTokenRepository (Optional Layer)

To keep `UserService` consistent with the repository pattern used elsewhere, a dedicated `IRefreshTokenRepository` may be introduced:

**File:** `backend/TodoApp.Api/Repositories/IRefreshTokenRepository.cs`

```csharp
public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByHashAsync(string tokenHash);
    Task AddAsync(RefreshToken token);
    Task SaveChangesAsync();
}
```

`EfRefreshTokenRepository` implements it using `AppDbContext`. Registered in `Program.cs` as `Scoped`. This is the recommended approach for consistency; Backend Dev may inline the DB calls into `UserService` only if the repository adds no value in context.

---

### 3.10 AuthController Changes

**File:** `backend/TodoApp.Api/Controllers/AuthController.cs`

#### New endpoint: `POST /api/auth/refresh`

```
[EnableRateLimiting("login")]
[HttpPost("refresh")]
public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
```

- Calls `userService.RefreshAsync(request.RefreshToken)`.
- Returns `200 Ok(response)` on success.
- Returns `401 Unauthorized()` if result is null (invalid, expired, or revoked).
- No `[Authorize]` attribute — the endpoint is intentionally unauthenticated (access token may be expired).
- Rate-limited with the existing `"login"` policy (5 requests per 15-minute window per IP). This is consistent with the spec's instruction to reuse BL-016 rate limiting.

#### New endpoint: `POST /api/auth/logout`

```
[Authorize]
[HttpPost("logout")]
public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
```

- Calls `userService.RevokeRefreshTokenAsync(request.RefreshToken)`.
- Returns `204 NoContent()` unconditionally (revocation is idempotent; do not leak whether the token existed).
- Requires a valid access token (`[Authorize]`): this prevents anonymous actors from probing the revocation endpoint with guessed tokens.

#### Existing endpoints

`Register` and `Login` already return `AuthResponse`. Once `AuthResponse` is updated, they automatically include `RefreshToken` with no controller-level changes.

---

### 3.11 Program.cs Changes

Add scoped registration for the refresh token repository:

```csharp
builder.Services.AddScoped<IRefreshTokenRepository, EfRefreshTokenRepository>();
```

No other changes to `Program.cs` are required. JWT validation parameters (`ValidateLifetime = true`) already enforce access token expiry correctly at 15 minutes.

---

## 4. Frontend

### 4.1 cacheKeys.ts — New SecureStore Key

**File:** `mobile/src/services/cache/cacheKeys.ts`

Add:

```typescript
export const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token';
```

The existing access token key `'auth_token'` is defined inline in `AuthContext.tsx` as `KEY_TOKEN`. For consistency, it should remain as-is in that file; only the new key is added to `cacheKeys.ts`. (Future refactor to unify all auth SecureStore keys is out of scope for this sprint.)

---

### 4.2 authApi.ts — New File

**File:** `mobile/src/services/api/authApi.ts`

This file does not currently exist. Create it with the following shape:

```typescript
import { API_BASE_URL } from './config';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json() as Promise<AuthResponse>;
}

export async function registerApi(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Register failed');
  return res.json() as Promise<AuthResponse>;
}

export async function refreshTokenApi(rawRefreshToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rawRefreshToken }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  return res.json() as Promise<AuthResponse>;
}

export async function logoutApi(
  accessToken: string,
  rawRefreshToken: string,
): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken: rawRefreshToken }),
  });
  // Ignore response — logout is best-effort; client always clears local state.
}
```

`loginApi` and `registerApi` use raw `fetch` (not `apiFetch`) because they run before a token is available. `refreshTokenApi` also uses raw `fetch` to avoid triggering the 401 intercept recursively. `logoutApi` passes the access token explicitly rather than relying on `apiFetch`'s SecureStore read, because logout should proceed even if SecureStore read fails.

---

### 4.3 AuthContext Changes

**File:** `mobile/src/context/AuthContext.tsx`

#### State shape

Add `refreshToken` to `AuthState`:

```typescript
interface AuthState {
  token: string | null;
  refreshToken: string | null;
  userId: string | null;
  email: string | null;
  isLoading: boolean;
}
```

#### SecureStore key

Add alongside the existing key constants at the top of the provider:

```typescript
import { AUTH_REFRESH_TOKEN_KEY } from '../services/cache/cacheKeys';

const KEY_TOKEN        = 'auth_token';
const KEY_REFRESH      = AUTH_REFRESH_TOKEN_KEY;  // 'auth_refresh_token'
const KEY_USER_ID      = 'auth_userId';
const KEY_EMAIL        = 'auth_email';
```

#### `login` signature change

```typescript
interface AuthContextValue extends AuthState {
  login: (accessToken: string, refreshToken: string, userId: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
}
```

Implementation stores both tokens:

```typescript
const login = useCallback(
  async (accessToken: string, refreshToken: string, userId: string, email: string) => {
    await Promise.all([
      SecureStore.setItemAsync(KEY_TOKEN, accessToken),
      SecureStore.setItemAsync(KEY_REFRESH, refreshToken),
      SecureStore.setItemAsync(KEY_USER_ID, userId),
      SecureStore.setItemAsync(KEY_EMAIL, email),
    ]);
    setState({ token: accessToken, refreshToken, userId, email, isLoading: false });
  },
  [],
);
```

#### `logout` change

Logout must call the backend before clearing local state, so the server revokes the token. If the network call fails, local state is still cleared (best-effort revocation):

```typescript
const logout = useCallback(async () => {
  const currentUserId     = userIdRef.current;
  const currentToken      = state.token;
  const currentRefresh    = state.refreshToken; // read from state or SecureStore

  // Best-effort server revocation
  if (currentToken && currentRefresh) {
    try {
      await logoutApi(currentToken, currentRefresh);
    } catch {
      // Ignore — clear local state regardless
    }
  }

  await Promise.all([
    SecureStore.deleteItemAsync(KEY_TOKEN),
    SecureStore.deleteItemAsync(KEY_REFRESH),
    SecureStore.deleteItemAsync(KEY_USER_ID),
    SecureStore.deleteItemAsync(KEY_EMAIL),
  ]);

  queryClient.clear();

  if (currentUserId) {
    await AsyncStorage.removeItem(`todos_cache_${currentUserId}`);
  }

  setState({ token: null, refreshToken: null, userId: null, email: null, isLoading: false });
}, [queryClient, state.token, state.refreshToken]);
```

Note: `state.token` and `state.refreshToken` are needed inside `logout`. To avoid stale closure issues (parallel to the existing `userIdRef` pattern), refs should be used for both:

```typescript
const tokenRef        = useRef<string | null>(null);
const refreshTokenRef = useRef<string | null>(null);

useEffect(() => { tokenRef.current        = state.token; },        [state.token]);
useEffect(() => { refreshTokenRef.current = state.refreshToken; }, [state.refreshToken]);
```

Then `logout` reads `tokenRef.current` and `refreshTokenRef.current` instead of state directly.

#### Session restore

Include `KEY_REFRESH` in the parallel `SecureStore` reads on mount:

```typescript
const [token, refreshToken, userId, email] = await Promise.all([
  SecureStore.getItemAsync(KEY_TOKEN),
  SecureStore.getItemAsync(KEY_REFRESH),
  SecureStore.getItemAsync(KEY_USER_ID),
  SecureStore.getItemAsync(KEY_EMAIL),
]);

setState({ token, refreshToken, userId, email, isLoading: false });
```

#### Remove `registerUnauthorizedCallback`

The current `registerUnauthorizedCallback` pattern in `config.ts` triggers an immediate logout on any 401. Once the refresh intercept in `apiFetch` is in place (section 4.4), this callback must **not** fire during an in-flight refresh. The callback is retained as the final fallback (called only when refresh itself fails), but it is no longer called for every raw 401.

---

### 4.4 apiFetch — 401 Intercept with Refresh Queue

**File:** `mobile/src/services/api/config.ts`

The current implementation calls `_onUnauthorized()` on every 401. This must be replaced with a refresh-then-retry loop. Concurrent 401 responses must queue behind a single refresh call.

Module-level state (outside the function):

```typescript
let isRefreshing = false;
let waitQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];
```

New `apiFetch` logic:

```
async function apiFetch(path, options):
  read accessToken from SecureStore('auth_token')
  attach Authorization header if token present

  response = await fetch(path, ...)

  if response.status !== 401 OR options.skipUnauthorized:
    handle network errors (existing logic)
    return response

  // --- 401 path ---

  if isRefreshing:
    // queue this request; wait for the in-flight refresh to complete
    newToken = await new Promise((resolve, reject) => waitQueue.push({ resolve, reject }))
    // retry with new token
    return fetch(path, { ...options, headers: { ...headers, Authorization: `Bearer ${newToken}` } })

  // This call is first — own the refresh
  isRefreshing = true

  try:
    rawRefresh = await SecureStore.getItemAsync('auth_refresh_token')
    if rawRefresh is null:
      throw new Error('no refresh token')

    data = await refreshTokenApi(rawRefresh)          // POST /api/auth/refresh

    await SecureStore.setItemAsync('auth_token',         data.accessToken)
    await SecureStore.setItemAsync('auth_refresh_token', data.refreshToken)

    // flush queue with new access token
    waitQueue.forEach(({ resolve }) => resolve(data.accessToken))

    // retry original request
    return fetch(path, { ...options, headers: { ...headers, Authorization: `Bearer ${data.accessToken}` } })

  catch:
    // refresh failed — flush queue with error, then logout
    waitQueue.forEach(({ reject }) => reject(new Error('Session expired')))
    _onUnauthorized?.()   // triggers AuthContext.logout
    throw error           // propagate to original caller

  finally:
    isRefreshing = false
    waitQueue = []
```

Key invariants:
- `isRefreshing` and `waitQueue` are reset in `finally`, not in the individual branches.
- `refreshTokenApi` uses raw `fetch`, not `apiFetch`, to avoid re-entering the 401 intercept.
- The retry call also uses raw `fetch` (not `apiFetch`) to avoid a second 401-intercept cycle.
- `skipUnauthorized: true` remains supported for callers that intentionally handle their own 401 (no changes needed to existing usages).

---

## 5. Data Flow Diagrams

### Normal Request (Access Token Valid)

```
Client → apiFetch("/api/todos") 
  → attach Authorization: Bearer <accessToken>
  → 200 OK
```

### Access Token Expired (Single Request)

```
Client → apiFetch("/api/todos")
  → 401
  → isRefreshing = true
  → POST /api/auth/refresh { refreshToken }
  → 200 { accessToken', refreshToken' }
  → store both tokens in SecureStore
  → retry GET /api/todos with new accessToken'
  → 200 OK → return to original caller
```

### Concurrent 401s

```
Request A → 401 → owns refresh → isRefreshing = true
Request B → 401 → isRefreshing = true → enqueued
Request C → 401 → isRefreshing = true → enqueued

  POST /api/auth/refresh → 200 { accessToken' }
  → store tokens
  → flush queue: B.resolve(accessToken'), C.resolve(accessToken')
  → A retries with accessToken'
  → B retries with accessToken'
  → C retries with accessToken'
```

### Refresh Fails (Session Expired)

```
Client → apiFetch("/api/todos") → 401
  → POST /api/auth/refresh → 401
  → flush queue with Error
  → _onUnauthorized() → AuthContext.logout()
    → logoutApi() [best-effort, will also fail if token is invalid]
    → clear SecureStore
    → queryClient.clear()
    → navigate to LoginScreen
```

---

## 6. Security Decisions

| Decision | Rationale |
|----------|-----------|
| Store only SHA-256 hash | A compromised DB does not expose usable tokens |
| 512-bit entropy for raw token | `RandomNumberGenerator.GetBytes(64)` — brute force is infeasible |
| Token rotation on every use | Limits exposure window; a reused revoked token can signal token theft |
| Expired and revoked both return 401 | No information leakage about token state |
| `[EnableRateLimiting("login")]` on `/refresh` | Prevents refresh token bruteforce (existing 5/15 min per-IP policy) |
| `[Authorize]` on `/logout` | Requires a valid (or recently valid) access token; prevents anonymous revocation probing |
| Logout is best-effort on client | Network failures during logout must not block the user from being signed out locally |
| Cascade delete on FK | Refresh tokens are automatically removed when a user account is deleted |

---

## 7. File Change Summary

### Backend — New Files

| File | Description |
|------|-------------|
| `backend/TodoApp.Api/Models/RefreshToken.cs` | New entity |
| `backend/TodoApp.Api/DTOs/Auth/RefreshRequest.cs` | New request DTO |
| `backend/TodoApp.Api/Repositories/IRefreshTokenRepository.cs` | New repository interface |
| `backend/TodoApp.Api/Repositories/EfRefreshTokenRepository.cs` | EF Core implementation |
| `backend/TodoApp.Api/Migrations/*_AddRefreshToken.cs` | EF Core migration |

### Backend — Modified Files

| File | Change |
|------|--------|
| `backend/TodoApp.Api/Models/User.cs` | No change needed (navigation property is on `RefreshToken` side) |
| `backend/TodoApp.Api/Data/AppDbContext.cs` | Add `DbSet<RefreshToken>`, add entity config block |
| `backend/TodoApp.Api/DTOs/Auth/AuthResponse.cs` | Rename `Token` → `AccessToken`; add `RefreshToken` |
| `backend/TodoApp.Api/Services/IUserService.cs` | Add `RefreshAsync` and `RevokeRefreshTokenAsync` signatures |
| `backend/TodoApp.Api/Services/UserService.cs` | Implement new methods; update `GenerateJwt` config key; update `LoginAsync` + `RegisterAsync` to issue refresh tokens |
| `backend/TodoApp.Api/Controllers/AuthController.cs` | Add `Refresh` and `Logout` actions |
| `backend/TodoApp.Api/Program.cs` | Register `IRefreshTokenRepository` |
| `backend/TodoApp.Api/appsettings.json` | Replace `ExpiryDays` with `AccessTokenExpiryMinutes` + `RefreshTokenExpiryDays` |

### Frontend — New Files

| File | Description |
|------|-------------|
| `mobile/src/services/api/authApi.ts` | `loginApi`, `registerApi`, `refreshTokenApi`, `logoutApi` |

### Frontend — Modified Files

| File | Change |
|------|--------|
| `mobile/src/services/cache/cacheKeys.ts` | Add `AUTH_REFRESH_TOKEN_KEY` |
| `mobile/src/services/api/config.ts` | Replace simple 401→logout with refresh queue logic |
| `mobile/src/context/AuthContext.tsx` | Add `refreshToken` to state; update `login`, `logout`, `restoreSession` |
| All screens calling `login(token, userId, email)` | Update call site to `login(accessToken, refreshToken, userId, email)` |

---

## 8. Test Scenarios

The Tester agent should cover the following integration test cases for the backend:

1. `POST /api/auth/refresh` with valid token → `200`, new token pair, old token revoked.
2. `POST /api/auth/refresh` with already-revoked token → `401`.
3. `POST /api/auth/refresh` with expired token (manipulate `ExpiresAt` in DB) → `401`.
4. `POST /api/auth/refresh` with unknown token → `401`.
5. `POST /api/auth/logout` with valid access token + valid refresh token → `204`, token revoked in DB.
6. `POST /api/auth/logout` repeated (idempotent) → `204`.
7. Access token at 15 minutes expiry boundary (verify `ValidateLifetime` rejects expired JWT).
8. `POST /api/auth/login` response includes both `accessToken` and `refreshToken`.
9. `POST /api/auth/register` response includes both tokens.
10. Rate limit: 6th refresh request in window → `429`.

Frontend E2E scenarios:

1. Login → wait 15+ minutes (or mock token expiry) → make API call → observe silent refresh → request succeeds.
2. Simulate refresh failure → observe navigation to `LoginScreen`.
3. Two simultaneous API calls with expired token → only one `POST /api/auth/refresh` is issued.
4. Logout → `auth_refresh_token` not present in SecureStore → server returns 204.

---

## 9. Out of Scope

Per the product spec:

- Multiple device / session management
- Refresh token families / cascading revocation (detect token reuse as theft signal)
- Proactive (pre-expiry) token refresh
- Password reset (BL-010) and email verification (BL-011)
