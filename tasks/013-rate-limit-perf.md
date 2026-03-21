# Task List: 013 — Rate Limiting & Performance Optimization

Source spec: `docs/rate-limit-perf-spec.md`
Architecture: `docs/rate-limit-perf-architecture.md`
Stack: .NET 8 ASP.NET Core (Backend) · React Native Expo / TypeScript (Frontend)
Sprint: v1.0.0 Sprint 2 — BL-016 (Rate Limiting) + BL-034 (Performance)

---

## RL-001 — Add RateLimit config section to appsettings.json
**Owner:** architect
**Deps:** none
**Estimate:** S

Add a `"RateLimit"` JSON section to `backend/TodoApp.Api/appsettings.json` with keys `LoginWindowSeconds` (900) and `LoginPermitLimit` (5). Mirror the same section in `backend/TodoApp.Api/appsettings.Development.json` with identical values so local development matches production defaults. No other files are modified in this ticket.

**Files modified:** `backend/TodoApp.Api/appsettings.json`, `backend/TodoApp.Api/appsettings.Development.json`
**Files must NOT be modified:** `Program.cs`, `AuthController.cs`, any migration or test file

---

## RL-002 — Register rate limiting middleware in Program.cs
**Owner:** backend
**Deps:** RL-001
**Estimate:** M

In `backend/TodoApp.Api/Program.cs`, call `builder.Services.AddRateLimiter(...)` after `builder.Services.AddControllers()` to register a fixed-window policy named `"login"`. Read window size and permit limit from `IConfiguration` using the `RateLimit:LoginWindowSeconds` and `RateLimit:LoginPermitLimit` keys added in RL-001. Set `options.RejectionStatusCode = 429`, configure `OnRejected` to write the `Retry-After` header and a JSON body `{ status: 429, message: "Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin." }`, and call `app.UseRateLimiter()` between `app.UseCors()` and `app.UseAuthentication()` in the middleware pipeline.

Per the architecture note, use `AddPolicy<string>` with IP-based partition (`HttpContext.Connection.RemoteIpAddress`) rather than the global `AddFixedWindowLimiter` overload, so the limit is per-IP as the spec requires.

**Files modified:** `backend/TodoApp.Api/Program.cs`
**Files must NOT be modified:** `AuthController.cs`, any repository, any migration file

---

## RL-003 — Apply [EnableRateLimiting] to AuthController Login action
**Owner:** backend
**Deps:** RL-002
**Estimate:** S

In `backend/TodoApp.Api/Controllers/AuthController.cs`, add `using Microsoft.AspNetCore.RateLimiting;` and decorate only the `Login` action method with `[EnableRateLimiting("login")]`. The attribute must be on the action, not the controller class, so that `Register`, `GetProfile`, `ChangeEmail`, `ChangePassword`, and `DeleteAccount` actions are unaffected. Confirm `dotnet build` exits clean.

**Files modified:** `backend/TodoApp.Api/Controllers/AuthController.cs`
**Files must NOT be modified:** Any other controller, `Program.cs`

---

## RL-004 — Wrap TodoItem with React.memo
**Owner:** frontend
**Deps:** none
**Estimate:** S

In `mobile/src/components/TodoItem.tsx`, wrap the `TodoItem` function component with `memo` using named import (`import { memo, ... } from 'react'`). Apply default shallow equality (no custom comparator). The `TodoItemProps` interface must remain unchanged. Confirm `npx tsc --noEmit` passes after the change.

**Files modified:** `mobile/src/components/TodoItem.tsx`
**Files must NOT be modified:** `TodoListScreen.tsx`, any type definition file

---

## RL-005 — Wrap handler functions with useCallback in TodoListScreen
**Owner:** frontend
**Deps:** RL-004
**Estimate:** M

In `mobile/src/screens/TodoListScreen.tsx`, wrap `handleToggle`, `handlePin`, `handleDeleteConfirm`, and `handleDeletePress` with `useCallback`. The dependency arrays must follow `react-hooks/exhaustive-deps` rules: `handleToggle` depends on `[toggleMutation, t]`, `handlePin` on `[pinMutation, t]`, `handleDeleteConfirm` on `[deleteMutation, t]`, and `handleDeletePress` on `[t, handleDeleteConfirm]`. Add `useCallback` to the `react` named import. The `renderItem` inline arrow function is intentionally left unwrapped per architecture decision.

**Files modified:** `mobile/src/screens/TodoListScreen.tsx`
**Files must NOT be modified:** `TodoItem.tsx`, any mutation hook file

---

## RL-006 — Add FlatList optimization props in TodoListScreen
**Owner:** frontend
**Deps:** RL-005
**Estimate:** S

In `mobile/src/screens/TodoListScreen.tsx`, add the following props to the `FlatList` component: `removeClippedSubviews={true}`, `initialNumToRender={10}`, `maxToRenderPerBatch={10}`, `windowSize={5}`. Do NOT add `getItemLayout` — item height is variable due to the `isPending` row and the architecture doc explicitly prohibits it. The existing `keyExtractor` must remain unchanged as `(item) => item.id`.

**Files modified:** `mobile/src/screens/TodoListScreen.tsx`
**Files must NOT be modified:** `TodoItem.tsx`, any service or API file

---

## RL-007 — Write integration test: 6th login request returns 429
**Owner:** test
**Deps:** RL-002, RL-003
**Estimate:** M

Create `backend/TodoApp.Api.Tests/RateLimitTests.cs`. The test class must use `IClassFixture<CustomWebApplicationFactory>` and override rate limit config via `builder.UseSetting("RateLimit:LoginWindowSeconds", "900")` and `builder.UseSetting("RateLimit:LoginPermitLimit", "5")`. Implement one `[Fact]` named `RateLimit_Login_Returns429_AfterExceedingLimit`: send 5 `POST /api/auth/login` requests with invalid credentials (expect 401 each), send a 6th request, then assert status is `429 Too Many Requests`, response headers contain `Retry-After`, and the response body `.status` field equals `429`. Use an anonymous `HttpClient` (`factory.CreateClient()`, no auth token).

**Files created:** `backend/TodoApp.Api.Tests/RateLimitTests.cs`
**Files must NOT be modified:** `CustomWebApplicationFactory.cs`, any existing test file

---

## RL-008 — TypeScript clean check + FlatList smoke test checklist
**Owner:** test
**Deps:** RL-004, RL-005, RL-006
**Estimate:** S

Run `npx tsc --noEmit` in the `mobile/` directory and confirm it exits with zero errors. Then perform a manual smoke test on a simulator or device: scroll a list of 20+ todos without visible jank, toggle a todo, pin a todo, delete a todo with confirmation, and navigate to task detail and back. Verify no functional regression. Document the result as a pass/fail checklist comment in the PR description.

**Files modified:** none (verification only)

---

## Summary Table

| Ticket | Owner     | Title                                                        | Est. | Dependency       |
|--------|-----------|--------------------------------------------------------------|------|------------------|
| RL-001 | architect | Add RateLimit config to appsettings.json                     | S    | none             |
| RL-002 | backend   | Register rate limiting middleware in Program.cs              | M    | RL-001           |
| RL-003 | backend   | Apply [EnableRateLimiting] to AuthController Login action    | S    | RL-002           |
| RL-004 | frontend  | Wrap TodoItem with React.memo                                | S    | none             |
| RL-005 | frontend  | Wrap handler functions with useCallback in TodoListScreen    | M    | RL-004           |
| RL-006 | frontend  | Add FlatList optimization props in TodoListScreen            | S    | RL-005           |
| RL-007 | test      | Integration test: 6th login request returns 429             | M    | RL-002, RL-003   |
| RL-008 | test      | TypeScript clean check + FlatList smoke test checklist       | S    | RL-004, RL-005, RL-006 |

## Dependency Order

```
RL-001 → RL-002 → RL-003 → RL-007
RL-004 → RL-005 → RL-006 → RL-008
```

Backend ve Frontend branch'leri birbirinden bağımsız olarak paralel geliştirilebilir.
