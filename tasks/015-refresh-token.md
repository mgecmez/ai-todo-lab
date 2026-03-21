# Task List: 015 — Refresh Token (BL-012)

Source spec: `docs/refresh-token-spec.md`
Architecture: `docs/refresh-token-architecture.md`
Backlog item: BL-012
Stack: .NET 8 / ASP.NET Core · Entity Framework Core · SQLite · Expo React Native · TypeScript · SecureStore

---

## RT-001 — Add `RefreshToken` entity model
**Owner:** architect
**Deps:** none
**Estimate:** S

`backend/TodoApp.Api/Models/RefreshToken.cs` dosyası oluşturulur. Entity; `Id` (Guid), `TokenHash` (SHA-256 hex, 64 karakter), `UserId` (Guid FK), `ExpiresAt`, `RevokedAt?`, `CreatedAt` ve `User` navigation property alanlarını içerir. `IsActive` hesaplanmış property olarak service katmanı kolaylığı için eklenir: `RevokedAt is null && ExpiresAt > DateTime.UtcNow`.

**Creates:** `backend/TodoApp.Api/Models/RefreshToken.cs`
**Must NOT modify:** `backend/TodoApp.Api/Models/User.cs`, `backend/TodoApp.Api/Models/Todo.cs`

---

## RT-002 — Add `DbSet<RefreshToken>` + `TokenHash` unique index to `AppDbContext`
**Owner:** architect
**Deps:** RT-001
**Estimate:** S

`backend/TodoApp.Api/Data/AppDbContext.cs` dosyasına `DbSet<RefreshToken> RefreshTokens` property'si ve `OnModelCreating` içine entity konfigürasyon bloğu eklenir. Blok: `TokenHash` için `IsRequired` + `HasMaxLength(64)`, `IX_RefreshTokens_TokenHash` isimli unique index, `ExpiresAt` ve `CreatedAt` required, `RevokedAt` nullable, `User` navigation için `OnDelete(DeleteBehavior.Cascade)` tanımlamaları içerir.

**Modifies:** `backend/TodoApp.Api/Data/AppDbContext.cs`
**Must NOT modify:** `backend/TodoApp.Api/Data/` altındaki diğer dosyalar

---

## RT-003 — Add `AUTH_REFRESH_TOKEN_KEY` to `cacheKeys.ts`; update `appsettings.json` Jwt config
**Owner:** architect
**Deps:** none
**Estimate:** S

`mobile/src/services/cache/cacheKeys.ts` dosyasına `export const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token';` satırı eklenir. `backend/TodoApp.Api/appsettings.json` dosyasındaki `Jwt` bloğu güncellenir: `ExpiryDays` kaldırılır, yerine `AccessTokenExpiryMinutes: 15` ve `RefreshTokenExpiryDays: 30` eklenir. `appsettings.Development.json` varsa `ExpiryDays` override'ı da kaldırılır.

**Modifies:** `mobile/src/services/cache/cacheKeys.ts`, `backend/TodoApp.Api/appsettings.json`
**Must NOT modify:** `mobile/src/services/cache/storage.ts`, `mobile/src/services/cache/todosCacheService.ts`

---

## RT-004 — Create EF Core migration `AddRefreshToken`
**Owner:** backend
**Deps:** RT-001, RT-002
**Estimate:** S

`backend/TodoApp.Api` dizininde `dotnet ef migrations add AddRefreshToken` komutu çalıştırılır. Üretilen migration `RefreshTokens` tablosunu ve `IX_RefreshTokens_TokenHash` unique index'i oluşturur. Mevcut veriler etkilenmez. `Program.cs` içindeki `dbContext.Database.Migrate()` çağrısı migration'ı uygulama başlangıcında otomatik çalıştırır; `Program.cs`'e dokunulmaz.

**Creates:** `backend/TodoApp.Api/Migrations/*_AddRefreshToken.cs`, `backend/TodoApp.Api/Migrations/*_AddRefreshToken.Designer.cs`
**Must NOT modify:** `backend/TodoApp.Api/Program.cs`, mevcut migration dosyaları

---

## RT-005 — Update `AuthResponse` DTO — rename `Token` → `AccessToken`, add `RefreshToken` field
**Owner:** backend
**Deps:** RT-003
**Estimate:** S

`backend/TodoApp.Api/DTOs/Auth/AuthResponse.cs` dosyasında `Token` alanı `AccessToken` olarak yeniden adlandırılır ve `RefreshToken` string alanı eklenir. Bu breaking change'dir; RT-006 ve RT-012 bu dosyaya bağımlıdır. Ayrıca `backend/TodoApp.Api/DTOs/Auth/RefreshRequest.cs` dosyası oluşturulur: `[Required] string RefreshToken` alanı içerir.

**Modifies:** `backend/TodoApp.Api/DTOs/Auth/AuthResponse.cs`
**Creates:** `backend/TodoApp.Api/DTOs/Auth/RefreshRequest.cs`
**Must NOT modify:** `backend/TodoApp.Api/DTOs/` altındaki diğer DTO dosyaları

---

## RT-006 — Implement refresh token generation + hashing in `UserService`; update `LoginAsync` and `RegisterAsync`
**Owner:** backend
**Deps:** RT-004, RT-005
**Estimate:** M

`backend/TodoApp.Api/Services/UserService.cs` dosyasına `HashToken(string rawToken)` (SHA-256, 64-char hex) ve `GenerateRawRefreshToken()` (64 random byte, Base64) private static metodları eklenir. `GenerateJwt` içinde `Jwt:ExpiryDays` referansı `Jwt:AccessTokenExpiryMinutes` (int, dakika) olarak güncellenir. `LoginAsync` ve `RegisterAsync` metodları raw refresh token üretip `RefreshToken` entity'si persist ederek yeni `AuthResponse` şeklini (hem `AccessToken` hem `RefreshToken`) döner. Repository pattern için `IRefreshTokenRepository` / `EfRefreshTokenRepository` oluşturulur ve `Program.cs`'e scoped olarak kaydedilir.

**Creates:** `backend/TodoApp.Api/Repositories/IRefreshTokenRepository.cs`, `backend/TodoApp.Api/Repositories/EfRefreshTokenRepository.cs`
**Modifies:** `backend/TodoApp.Api/Services/UserService.cs`, `backend/TodoApp.Api/Program.cs`
**Must NOT modify:** `backend/TodoApp.Api/Repositories/ITodoRepository.cs`, `backend/TodoApp.Api/Repositories/EfTodoRepository.cs`

---

## RT-007 — Implement `RefreshAsync` in `UserService`
**Owner:** backend
**Deps:** RT-006
**Estimate:** M

`UserService.RefreshAsync(string rawRefreshToken)` metodu implemente edilir. Adımlar: token hash'lenir → DB'de `TokenHash` ile aranır → bulunamazsa `null` döner → `IsActive` false ise `null` döner → eski token `RevokedAt = UtcNow` ile revoke edilir → yeni token üretilir ve persist edilir → yeni access token üretilir → tümü tek bir DB transaction içinde `SaveChangesAsync` ile kaydedilir → yeni `AuthResponse` döner. `IUserService` interface'ine `Task<AuthResponse?> RefreshAsync(string rawRefreshToken)` imzası eklenir.

**Modifies:** `backend/TodoApp.Api/Services/UserService.cs`, `backend/TodoApp.Api/Services/IUserService.cs`
**Must NOT modify:** `backend/TodoApp.Api/Controllers/AuthController.cs` (RT-009'a bırakılır)

---

## RT-008 — Implement `RevokeRefreshTokenAsync` in `UserService`
**Owner:** backend
**Deps:** RT-006
**Estimate:** S

`UserService.RevokeRefreshTokenAsync(string rawRefreshToken)` metodu implemente edilir. Token hash'lenir, DB'de aranır; bulunamazsa veya zaten revoke edilmişse no-op (idempotent). Bulunursa `RevokedAt = UtcNow` set edilip `SaveChangesAsync` çağrılır. `IUserService` interface'ine `Task RevokeRefreshTokenAsync(string rawRefreshToken)` imzası eklenir.

**Modifies:** `backend/TodoApp.Api/Services/UserService.cs`, `backend/TodoApp.Api/Services/IUserService.cs`
**Must NOT modify:** `backend/TodoApp.Api/Controllers/AuthController.cs` (RT-009'a bırakılır)

---

## RT-009 — Add `POST /api/auth/refresh` and `POST /api/auth/logout` to `AuthController`; update `IUserService`
**Owner:** backend
**Deps:** RT-007, RT-008
**Estimate:** S

`backend/TodoApp.Api/Controllers/AuthController.cs` dosyasına iki yeni action eklenir. `Refresh`: `[EnableRateLimiting("login")]`, `[HttpPost("refresh")]`, `[Authorize]` yok — `userService.RefreshAsync` çağırır, `null` ise `401`, değilse `200 Ok(response)` döner. `Logout`: `[Authorize]`, `[HttpPost("logout")]` — `userService.RevokeRefreshTokenAsync` çağırır, her zaman `204 NoContent` döner (idempotent). Mevcut `Register` ve `Login` action'larına dokunulmaz; `AuthResponse` güncellemesi RT-005'te yapıldığından otomatik olarak `RefreshToken` alanını içerir.

**Modifies:** `backend/TodoApp.Api/Controllers/AuthController.cs`
**Must NOT modify:** `backend/TodoApp.Api/Controllers/TodosController.cs`, `backend/TodoApp.Api/Controllers/HealthController.cs`

---

## RT-010 — Update `AuthContext` — store both tokens; update `login`, `logout`, session restore
**Owner:** frontend
**Deps:** RT-003
**Estimate:** M

`mobile/src/context/AuthContext.tsx` dosyası güncellenir. `AuthState`'e `refreshToken: string | null` eklenir. `login` imzası `(accessToken, refreshToken, userId, email)` olur; her iki token da `SecureStore`'a yazılır. `logout` best-effort olarak `logoutApi` çağırır, hata olsa da local state temizlenir; stale closure sorununu önlemek için `tokenRef` ve `refreshTokenRef` pattern'i uygulanır. Session restore (`useEffect` mount) `KEY_REFRESH` için de `SecureStore.getItemAsync` çağrısını paralel olarak ekler. `AUTH_REFRESH_TOKEN_KEY` `cacheKeys.ts`'ten import edilir. `login` call site'larının tümü (`LoginScreen`, `RegisterScreen`) yeni 4-parametre imzasına güncellenir.

**Modifies:** `mobile/src/context/AuthContext.tsx`, `mobile/src/screens/LoginScreen.tsx` (veya eşdeğeri), `mobile/src/screens/RegisterScreen.tsx` (veya eşdeğeri)
**Must NOT modify:** `mobile/src/services/api/config.ts` (RT-011'e bırakılır), `mobile/src/services/cache/cacheKeys.ts`

---

## RT-011 — Implement 401-intercept + refresh queue in `apiFetch` (`config.ts`)
**Owner:** frontend
**Deps:** RT-010, RT-012
**Estimate:** M

`mobile/src/services/api/config.ts` dosyasındaki `apiFetch` fonksiyonu güncellenir. Modül seviyesinde `isRefreshing: boolean` ve `waitQueue` dizisi tanımlanır. 401 alındığında: `isRefreshing` true ise istek queue'ya eklenir ve yeni token gelince retry yapılır; `isRefreshing` false ise bu çağrı refresh'e sahip olur, `SecureStore`'dan `auth_refresh_token` okunur, `refreshTokenApi` çağrılır, her iki yeni token `SecureStore`'a yazılır, queue flush edilir, orijinal istek retry edilir. Refresh başarısız olursa queue error ile flush edilir ve `_onUnauthorized()` çağrılır. `isRefreshing` ve `waitQueue` her durumda `finally` bloğunda sıfırlanır. Retry ve `refreshTokenApi` çağrıları raw `fetch` kullanır; `apiFetch`'e re-entrant girilmez.

**Modifies:** `mobile/src/services/api/config.ts`
**Must NOT modify:** `mobile/src/context/AuthContext.tsx`, `mobile/src/services/cache/cacheKeys.ts`

---

## RT-012 — Update `authApi.ts` — consume new `AuthResponse`; add `refreshTokenApi` and `logoutApi`
**Owner:** frontend
**Deps:** RT-005, RT-003
**Estimate:** S

`mobile/src/services/api/authApi.ts` dosyası oluşturulur (mevcut değil). `AuthResponse` interface'i `accessToken`, `refreshToken`, `userId`, `email` alanlarını içerir. `loginApi` ve `registerApi` yeni response şeklini consume eder. `refreshTokenApi(rawRefreshToken)` ve `logoutApi(accessToken, rawRefreshToken)` fonksiyonları raw `fetch` kullanılarak eklenir — `apiFetch` kullanılmaz (özyinelemeli 401 intercept döngüsünü önlemek için).

**Creates:** `mobile/src/services/api/authApi.ts`
**Must NOT modify:** `mobile/src/services/api/config.ts` (RT-011'e bırakılır), `mobile/src/services/api/todosApi.ts`

---

## RT-013 — Backend integration tests — refresh, rotation, expiry, logout
**Owner:** test
**Deps:** RT-009
**Estimate:** M

`backend/TodoApp.Api.Tests/` altına refresh token senaryolarını kapsayan integration test dosyası eklenir (`WebApplicationFactory` + EF Core InMemory kullanılır). Kapsanacak senaryolar: (1) geçerli token ile `POST /api/auth/refresh` → `200`, yeni token çifti döner, eski token DB'de revoke edilir; (2) revoke edilmiş token ile refresh → `401`; (3) `ExpiresAt` geçmiş token ile refresh → `401`; (4) bilinmeyen token ile refresh → `401`; (5) geçerli access + refresh token ile `POST /api/auth/logout` → `204`, token DB'de revoke; (6) logout idempotency → ikinci çağrı da `204`; (7) `POST /api/auth/login` yanıtı hem `accessToken` hem `refreshToken` içerir; (8) `POST /api/auth/register` yanıtı her iki token'ı içerir. `dotnet test` tüm mevcut testlerle birlikte geçmeli.

**Creates:** `backend/TodoApp.Api.Tests/RefreshTokenTests.cs` (veya benzer isim)
**Must NOT modify:** mevcut test dosyaları

---

## RT-014 — TypeScript clean check + `dotnet test` all pass
**Owner:** test
**Deps:** RT-011, RT-013
**Estimate:** S

`npx tsc --noEmit` sıfır hata ile çıkar. `dotnet test backend/TodoApp.Api.Tests` tüm testler (mevcut + yeni) geçer. Herhangi bir hata varsa ilgili ticket'a bug olarak raporlanır; bu ticket bir bloker sayılır ve sprint kapanmadan önce çözülmesi gerekir.

**Must NOT modify:** herhangi bir kaynak dosya — bu sadece doğrulama adımıdır

---

## Summary Table

| Ticket | Owner    | Title                                                              | Est. | Dependency         |
|--------|----------|--------------------------------------------------------------------|------|--------------------|
| RT-001 | architect | Add `RefreshToken` entity model                                   | S    | none               |
| RT-002 | architect | Add `DbSet<RefreshToken>` + `TokenHash` index to `AppDbContext`   | S    | RT-001             |
| RT-003 | architect | Add `AUTH_REFRESH_TOKEN_KEY`; update `appsettings.json` Jwt config| S    | none               |
| RT-004 | backend  | Create EF Core migration `AddRefreshToken`                         | S    | RT-001, RT-002     |
| RT-005 | backend  | Update `AuthResponse` DTO; create `RefreshRequest` DTO            | S    | RT-003             |
| RT-006 | backend  | Refresh token generation + hashing in `UserService`               | M    | RT-004, RT-005     |
| RT-007 | backend  | Implement `RefreshAsync` in `UserService`                          | M    | RT-006             |
| RT-008 | backend  | Implement `RevokeRefreshTokenAsync` in `UserService`               | S    | RT-006             |
| RT-009 | backend  | Add `/refresh` and `/logout` endpoints to `AuthController`         | S    | RT-007, RT-008     |
| RT-010 | frontend | Update `AuthContext` — both tokens, login/logout/restore           | M    | RT-003             |
| RT-011 | frontend | 401-intercept + refresh queue in `apiFetch`                        | M    | RT-010, RT-012     |
| RT-012 | frontend | Create `authApi.ts` with new `AuthResponse` shape                  | S    | RT-005, RT-003     |
| RT-013 | test     | Backend integration tests — refresh, rotation, expiry, logout      | M    | RT-009             |
| RT-014 | test     | TypeScript clean check + `dotnet test` all pass                    | S    | RT-011, RT-013     |

---

## Dependency Graph

```
RT-001 ──► RT-002 ──► RT-004 ──┐
                                 ├──► RT-006 ──► RT-007 ──┐
RT-003 ──► RT-005 ──────────────┘             RT-008 ──┘
  │                                                        ├──► RT-009 ──► RT-013 ──► RT-014
  │                                                                                      ▲
  ├──► RT-010 ──► RT-011 ────────────────────────────────────────────────────────────────┤
  │                  ▲                                                                    │
  └──► RT-012 ───────┘                                                                   │
                                                                         RT-011 ─────────┘
```

Doğrusal uygulama sırası:

```
RT-001 → RT-002 → RT-003 → RT-004 → RT-005 → RT-006 → RT-007 → RT-008
→ RT-009 → RT-010 → RT-012 → RT-011 → RT-013 → RT-014
```

Paralel başlatılabilecek gruplar:
- **Grup A** (bağımsız): RT-001, RT-003 paralel başlayabilir
- **Grup B**: RT-002 (RT-001 biter bitmez), RT-005 (RT-003 biter bitmez), RT-010 ve RT-012 (RT-003 biter bitmez)
- **Grup C**: RT-004 (RT-002 sonrası)
- **Grup D**: RT-006 (RT-004 + RT-005 sonrası)
- **Grup E**: RT-007 ve RT-008 paralel (RT-006 sonrası)
- **Grup F**: RT-009 (RT-007 + RT-008 sonrası), RT-011 (RT-010 + RT-012 sonrası) paralel
- **Son**: RT-013 (RT-009 sonrası) → RT-014 (RT-011 + RT-013 sonrası)
