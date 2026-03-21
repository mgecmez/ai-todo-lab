# Feature Spec — BL-016 + BL-034: Rate Limiting & Performance Optimization

**Sprint:** v1.0.0 Sprint 2
**Date:** 2026-03-21
**Scope:** Backend (BL-016) + Frontend (BL-034)

---

## BL-016 — Rate Limiting (Login Brute-Force Protection)

### Problem

The `/api/auth/login` endpoint currently has no protection against brute-force attacks. An attacker can make unlimited login attempts, systematically guessing passwords.

### Solution

Apply IP-based rate limiting to the login endpoint using .NET 8 built-in rate limiting middleware (`System.Threading.RateLimiting`).

### Functional Requirements

- **Limit:** Maximum 5 requests per 15-minute sliding window per IP address
- **Scope:** `/api/auth/login` (POST) only — no other endpoints affected
- **Response on exceed:** `429 Too Many Requests`
- **Headers:** `Retry-After` header included in 429 responses (seconds remaining)
- **Configuration:** Window size and limit configurable via `appsettings.json`
- **Reset:** Window resets after the configured time period

### User Stories

- As a user, I should be able to make up to 5 login attempts in 15 minutes without interruption
- As a user, if I exceed the limit, I should see a clear message (not a cryptic error) indicating I need to wait
- As an attacker, I must be blocked after 5 attempts and cannot bypass this with retries

### Acceptance Criteria

- [ ] POST `/api/auth/login` returns 429 after the 5th failed (or any) attempt within the window
- [ ] Response includes `Retry-After` header with seconds remaining
- [ ] Response body follows the standard error format: `{ status: 429, message: "..." }`
- [ ] Successful requests within the limit return normally (200 or 401)
- [ ] Rate limit config is in `appsettings.json` (not hardcoded)
- [ ] Integration test: 6th request returns 429

### Out of Scope

- Per-user rate limiting (IP-only for now)
- Rate limiting on other endpoints
- Distributed rate limiting (Redis) — single-instance only
- Account lockout after N failures

---

## BL-034 — Performance Optimization (100+ Todos)

### Problem

When a user has 100+ todos, the `TodoListScreen` may suffer from:
- Unnecessary re-renders of `TodoItem` components when unrelated state changes
- Slow scroll performance due to unoptimized `FlatList` configuration
- Handler function recreation on every render causing child prop changes

### Solution

Apply standard React Native performance patterns:
1. Wrap `TodoItem` with `React.memo` to skip re-renders when props haven't changed
2. Stabilize handler callbacks with `useCallback`
3. Configure `FlatList` with layout hints and render batching options

### Functional Requirements

- `TodoItem` must not re-render unless its own `todo` object, `busy`, or `isPending` props change
- `FlatList` should render smoothly with 100+ items (no visible jank during scroll)
- All existing functionality must work identically — this is a pure performance change

### User Stories

- As a user with many todos, scrolling should feel smooth and responsive
- As a developer, the component tree should not thrash on unrelated state changes

### Acceptance Criteria

- [ ] `TodoItem` is wrapped with `React.memo`
- [ ] `handleToggle`, `handlePin`, `handleDeletePress` in `TodoListScreen` wrapped with `useCallback`
- [ ] `FlatList` has `removeClippedSubviews={true}` (Android)
- [ ] `FlatList` has `initialNumToRender={10}` and `maxToRenderPerBatch={10}`
- [ ] `FlatList` has `getItemLayout` if item height is fixed/estimable
- [ ] `keyExtractor` is stable (already `item.id` — verify it remains)
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [ ] No functional regression — toggle, pin, delete, navigation all work

### Out of Scope

- Virtualization beyond FlatList (e.g., FlashList migration)
- Pagination / infinite scroll
- Backend-side filtering/pagination

---

## Dependencies

- BL-016 depends on: existing Auth middleware (v0.6.0)
- BL-034 depends on: existing TodoListScreen (v0.8.0+)
- Neither feature depends on the other — can be developed in parallel
