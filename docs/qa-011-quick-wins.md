# v0.10.0 Quick Wins — Validation Report

**Sprint:** v0.10.0 — Quick Wins (BL-001 through BL-005)
**Date:** 2026-03-21
**Method:** Static code analysis (source files read against acceptance criteria)
**Tester:** QA Agent (Claude Sonnet 4.6)
**Task reference:** `tasks/011-quick-wins.md`
**Architecture reference:** `docs/quick-wins-architecture.md`

---

## Summary Result

| Area | Status | Notes |
|------|--------|-------|
| TypeScript build (static analysis) | PASS (inferred) | No type mismatches found during manual review — see TypeScript section |
| BL-005 isOverdue extraction | PASS | All acceptance criteria met |
| BL-004 placeholder prop | PASS | All acceptance criteria met |
| BL-001 All-Day mode | PASS with observation | Minor allDay-reset edge case noted (low risk) |
| BL-002 Past-date warning | PASS | All acceptance criteria met |
| BL-003 Toggle notification | PASS with observation | `reminderOffset != null` vs falsy-zero edge case noted |
| Overall regression risk | LOW | No shared utility broken; no backend changes |

---

## Per-Feature Acceptance Criteria Checklist

### BL-005 — `isOverdue` Utility Extraction (QW-001)

| # | Acceptance Criterion | Status | Evidence |
|---|---------------------|--------|----------|
| AC-1 | `mobile/src/utils/isOverdue.ts` exists and exports `isOverdue` as a named export | PASS | File present at exact path; `export function isOverdue(...)` on line 1 |
| AC-2 | `TodoListScreen.tsx` has no inline `isOverdue` definition; imports from `../utils/isOverdue` | PASS | Line 21: `import { isOverdue } from '../utils/isOverdue';` — no local definition in file |
| AC-3 | `TaskDetailScreen.tsx` has no inline `isOverdue` definition; imports from `../utils/isOverdue` | PASS | Line 23: `import { isOverdue } from '../utils/isOverdue';` — no local definition in file |
| AC-4 | `npx tsc --noEmit` produces no new errors | PASS (inferred) | Signature matches architecture spec exactly; call sites pass `(string \| null \| undefined, boolean)` — type-safe |
| AC-5 | Overdue highlight behaviour on `TodoListScreen` unchanged from v0.9.0 | PASS | `isOverdue` used at line 43 in `TodoItem`; `cardMetaOverdue` style applied at line 78 — identical pattern to prior inline version |
| AC-6 | Overdue highlight behaviour on `TaskDetailScreen` unchanged from v0.9.0 | PASS | `isOverdue` used at line 123; icon color and `metaOverdue` style applied at lines 192–193 — identical logic |

**Static Analysis Findings — BL-005:**

The extracted function signature `isOverdue(dueDate: string | null | undefined, isCompleted: boolean): boolean` exactly matches the canonical definition in `docs/quick-wins-architecture.md`. The runtime guard `!dueDate` covers both `null` and `undefined` inputs, so the `undefined` union addition is backwards-compatible and introduces no behavioural change. No findings.

---

### BL-004 — `DateTimePickerField` Placeholder Prop (QW-002)

| # | Acceptance Criterion | Status | Evidence |
|---|---------------------|--------|----------|
| AC-1 | `DateTimePickerFieldProps` interface has `placeholder?: string` field | PASS | Line 23 of `DateTimePickerField.tsx`: `placeholder?: string;` |
| AC-2 | When `placeholder` is not passed, component displays `"Select date"` | PASS | Line 45: `placeholder = 'Select date'` default value in function signature |
| AC-3 | `TodoFormScreen` passes Turkish placeholder `"Tarih seçilmedi"` explicitly and it renders on screen | PASS | Lines 201–208 of `TodoFormScreen.tsx`: `placeholder="Tarih seçilmedi"` prop present on `<DateTimePickerField>` |
| AC-4 | Visible UI unchanged compared to v0.9.0 | PASS | The previously hardcoded `'Tarih seçilmedi'` string is now passed as a prop with the same value; no visual change |
| AC-5 | `npx tsc --noEmit` produces no new errors | PASS (inferred) | `placeholder` is optional with a string default; call site passes `string` literal — type-safe |
| AC-6 | Other props and behaviours of `DateTimePickerField` unchanged | PASS | No other prop signatures were modified; only new optional field added |

**Static Analysis Findings — BL-004:**

The `displayText ?? placeholder` render expression at line 155 correctly falls back to the prop value. The `displayText` variable is derived from `value?.toISOString()` via `formatDate` (line 132), which returns `null` when `value` is `null` — the nullish coalescence chain is correct. No findings.

---

### BL-001 — All-Day Mode (QW-003)

| # | Acceptance Criterion | Status | Evidence |
|---|---------------------|--------|----------|
| AC-1 | "Tum Gun" toggle appears in `TodoFormScreen` when a `dueDate` is selected | PASS | Lines 211–222 of `TodoFormScreen.tsx`: `{dueDate && (<View ...><Switch value={allDay} .../>...)}` |
| AC-2 | Toggle is hidden / not rendered when `dueDate` is null | PASS | Conditional `{dueDate && ...}` ensures the `Switch` is only mounted when `dueDate` is truthy |
| AC-3 | When toggle is active, picker skips the time step on iOS and Android | PASS | Android: lines 76–78 of `DateTimePickerField.tsx` — `if (allDay) { onChange(buildMidnightUTC(...)); }` skips `openAndroidTime`. iOS: lines 105–107 — `allDay` branch calls `onChange` and `setPhase('closed')` without entering `'time'` phase |
| AC-4 | When toggle is active, confirmed `dueDate` value ends with `T00:00:00.000Z` | PASS | `buildMidnightUTC(localDate)` at lines 28–34 constructs `new Date(Date.UTC(Y, M, D, 0, 0, 0, 0))` — always midnight UTC |
| AC-5 | Clearing `dueDate` resets toggle to `false` automatically | PASS | Lines 82–86 of `TodoFormScreen.tsx`: `handleDueDateChange` calls `setAllDay(false)` when `date` is null |
| AC-6 | All-Day task displays only `DD.MM.YYYY` in list and detail screens | PASS | `formatDate` returns date-only string when `getUTCHours() === 0 && getUTCMinutes() === 0` — compatible with midnight UTC storage |
| AC-7 | `buildMidnightUTC` is not exported (private to module) | PASS | Function defined at line 27 without `export` keyword |
| AC-8 | `npx tsc --noEmit` produces no new errors | PASS (inferred) | `allDay?: boolean` prop is optional with default `false`; `buildMidnightUTC` takes `Date` and returns `Date`; all call sites are type-correct |

**Static Analysis Findings — BL-001:**

**OBSERVATION (low risk, no immediate fix required):**

In `TodoFormScreen.tsx` the `allDay` state is initialised on lines 51–55 by inspecting whether the existing `dueDate` has `T00:00:00.000Z` format (UTC midnight check). However, `handleDueDateChange` (line 80) does not call `setAllDay(false)` when the user picks a _new_ date while `allDay` is currently `true` — it only resets `allDay` when `date` is null (line 85). This means:

- User enables "Tum Gun" toggle.
- User taps the date field _again_ (perhaps to change the day) while `allDay` is still `true`.
- The picker correctly applies `buildMidnightUTC` (because `allDay` prop is read at open-time), so the stored date is still midnight UTC.
- Behaviour is functionally correct. The observation only matters if a future feature allows toggling `allDay` off and the picker has already committed a midnight UTC value — in that case the time field would show `00:00`, which is visually accurate.

No AC is violated. Logged as a low-risk observation for awareness.

---

### BL-002 — Past-Date Warning (QW-004)

| # | Acceptance Criterion | Status | Evidence |
|---|---------------------|--------|----------|
| AC-1 | Selecting a future date from picker triggers no alert | PASS | `isOverdue(date.toISOString(), false)` returns `false` when date is in the future; `Alert.alert` is not called |
| AC-2 | Selecting a past date/time shows alert immediately after picker closes | PASS | Lines 86–92 of `TodoFormScreen.tsx`: `isOverdue(date.toISOString(), false)` called with `isCompleted=false`; if true, `Alert.alert('Gecmis Tarih', ...)` fires |
| AC-3 | Dismissing the alert leaves `dueDate` at the selected past value | PASS | `setDueDate(date)` at line 81 is unconditional — it runs before the `isOverdue` check; alert dismissal does not revert the state |
| AC-4 | Form can be saved after alert | PASS | The alert has only a "Tamam" button; `handleSave` is independent of `dueDate` validity beyond null-check |
| AC-5 | Opening edit form for a todo that already has a past `dueDate` does not trigger alert | PASS | `handleDueDateChange` is only called when the user interacts with the picker; the initial state hydration via `useState(editTodo?.dueDate ? new Date(editTodo.dueDate) : null)` does not invoke this handler |
| AC-6 | All-Day mode: selecting a past calendar day also triggers the alert | PASS | `buildMidnightUTC` returns a `Date` with midnight UTC of the selected day; `isOverdue` compares this against `new Date()` — if the day has already passed, the result is `true` |
| AC-7 | `npx tsc --noEmit` produces no new errors | PASS (inferred) | `isOverdue` import and call site are type-correct; `Alert` was already imported in `TodoFormScreen` |

**Static Analysis Findings — BL-002:**

The `isOverdue` call on line 86 passes `false` as `isCompleted`. This is intentional: the check must fire regardless of whether the todo happens to already be completed. The design choice is sound because `handleDueDateChange` is only reachable on an active form, not as a post-save callback.

One subtle edge case exists: when a user selects a date/time that is _exactly_ `new Date()` (current millisecond), the comparison `new Date(dueDate) < new Date()` is `false`, so no alert fires. This is correct and expected — exact-now is not overdue.

No findings.

---

### BL-003 — Toggle Notification Management (QW-005)

| # | Acceptance Criterion | Status | Evidence |
|---|---------------------|--------|----------|
| AC-1 | When a task is marked completed, `cancelReminder` is called | PASS | Lines 62–63 of `useToggleTodo.ts`: `if (updatedTodo.isCompleted) { notificationService.cancelReminder(updatedTodo.id).catch(() => {}); }` |
| AC-2 | After cancellation, notification is removed from `notificationRegistry` | PASS | `notificationService.cancelReminder` internally calls `notificationRegistry.remove(todoId)` (line 110 of `notificationService.ts`) — the registry is updated by the service, not the mutation hook |
| AC-3 | When marked incomplete and future `dueDate` + `reminderOffset` exist, `scheduleReminder` is called | PASS | Lines 64–71 of `useToggleTodo.ts`: else-if branch checks `updatedTodo.dueDate && updatedTodo.reminderOffset != null`, calculates `fireAt`, checks `fireAt > new Date()`, then calls `scheduleReminder` |
| AC-4 | When marked incomplete and `dueDate` or `reminderOffset` is null, `scheduleReminder` is not called | PASS | The `else if` condition at line 64 requires both fields to be non-null; missing either field skips the branch entirely |
| AC-5 | Network error causing rollback (`onError`) does not trigger notification logic | PASS | Notification calls are in `onSuccess` only; `onError` (lines 74–78) only restores cache snapshot — no notification code present |
| AC-6 | Toggle works without crash on Expo Go Android | PASS | `notificationService.cancelReminder` and `scheduleReminder` are guarded by `isExpoGoAndroid` check in `notificationService.ts` (line 33: `if (isExpoGoAndroid) return null`) — all async notification calls resolve silently |
| AC-7 | `npx tsc --noEmit` produces no new errors | PASS (inferred) | `notificationService` is imported from correct path; `updatedTodo` is typed as `Todo` which includes `dueDate: string | null`, `reminderOffset: number | null` — all accesses are type-safe |

**Static Analysis Findings — BL-003:**

**OBSERVATION (very low risk):**

The guard at line 64 uses `updatedTodo.reminderOffset != null` (strict null/undefined check). This correctly excludes `null` and `undefined` values. However, if `reminderOffset` were ever stored as `0` (meaning "notify at the exact moment of due date"), the condition `!= null` would evaluate to `true` and `fireAt` would equal `dueDate` exactly. The subsequent `fireAt > new Date()` guard would still prevent scheduling if that moment is already past. The edge case is theoretical since `REMINDER_OPTIONS` in `TodoFormScreen` does not offer `0` as a valid offset value (minimum is 5 minutes). No action required.

The `.catch(() => {})` on both notification calls correctly silences promise rejections, consistent with the defensive notification design established in v0.5.0.

---

## General Regression Check

| Area | Check | Status | Notes |
|------|-------|--------|-------|
| `formatDate` utility | Not modified; All-Day display relies on UTC midnight detection | PASS | No changes to `mobile/src/utils/formatDate.ts` |
| `TodoListScreen` rendering | Still imports and calls `isOverdue` for `cardMetaOverdue` styling | PASS | Line 43: `const overdue = isOverdue(todo.dueDate, todo.isCompleted)` |
| `TaskDetailScreen` rendering | Still imports and calls `isOverdue` for `metaOverdue` styling | PASS | Line 123: `const overdue = isOverdue(todo.dueDate, todo.isCompleted)` |
| `DateTimePickerField` non-allDay flow | Android two-step (date → time) and iOS two-phase (date → time) unchanged | PASS | `allDay=false` (default) takes the existing code path without modification |
| `DateTimePickerField` clear button | Clear button behaviour unchanged | PASS | Lines 160–169 unchanged; `onChange(null)` callback still wired |
| `useToggleTodo` optimistic update | Cache update in `onMutate` unchanged; `onError` rollback unchanged | PASS | Notification logic added only after the existing cache-write block in `onSuccess` |
| Backend | No backend files modified | PASS | All changes confined to `mobile/src/` |
| Navigation routes | No new routes; no changed route params | PASS | No modifications to `mobile/src/navigation/` |
| Theme tokens | No new tokens introduced; all styling uses existing tokens | PASS | `DateTimePickerField` and `TodoFormScreen` use tokens from `../theme/tokens` |

---

## TypeScript Build Static Analysis

`npx tsc --noEmit` was not executed (no running environment available at QA time). The following table records the result of manual type-safety review for each changed file.

| File | Key Type Interactions Checked | Inferred Result |
|------|-------------------------------|-----------------|
| `mobile/src/utils/isOverdue.ts` | Signature `(string \| null \| undefined, boolean): boolean` matches architecture spec; return type is boolean | PASS |
| `mobile/src/screens/TodoListScreen.tsx` | Import `{ isOverdue }` from correct relative path; call `isOverdue(todo.dueDate, todo.isCompleted)` — `todo.dueDate` is `string \| null` matching param type | PASS |
| `mobile/src/screens/TaskDetailScreen.tsx` | Import `{ isOverdue }` from correct relative path; call `isOverdue(todo.dueDate, todo.isCompleted)` — same type compatibility | PASS |
| `mobile/src/components/DateTimePickerField.tsx` | `placeholder?: string` added to interface; default value `'Select date'` is `string`; `displayText ?? placeholder` produces `string`; `allDay?: boolean` with default `false`; `buildMidnightUTC(localDate: Date): Date` — internal types consistent | PASS |
| `mobile/src/screens/TodoFormScreen.tsx` | `allDay` state typed as `boolean`; `setAllDay` called with `boolean` values; `placeholder="Tarih seçilmedi"` is a `string` literal; `isOverdue(date.toISOString(), false)` — `toISOString()` returns `string`, second arg is `boolean` | PASS |
| `mobile/src/mutations/useToggleTodo.ts` | `notificationService` imported from `'../services/notifications/notificationService'`; `cancelReminder(updatedTodo.id)` — `id` is `string` matching parameter; `scheduleReminder(updatedTodo)` — `updatedTodo` is `Todo` matching parameter; all return `Promise<void>` — `.catch(() => {})` is valid | PASS |

**Recommendation:** Run `cd mobile && npx tsc --noEmit` before merging to confirm no transitive type errors exist in the broader project. The analysis above covers only the modified files.

---

## Test Scenarios

### S-01 — isOverdue: null dueDate returns false

| Field | Value |
|-------|-------|
| Input | `isOverdue(null, false)` |
| Expected | `false` |
| Rationale | Guard `!dueDate` short-circuits |
| Status | PASS (static) |

### S-02 — isOverdue: completed todo with past dueDate returns false

| Field | Value |
|-------|-------|
| Input | `isOverdue('2020-01-01T00:00:00.000Z', true)` |
| Expected | `false` |
| Rationale | Guard `isCompleted` short-circuits |
| Status | PASS (static) |

### S-03 — isOverdue: past dueDate, not completed returns true

| Field | Value |
|-------|-------|
| Input | `isOverdue('2020-01-01T00:00:00.000Z', false)` |
| Expected | `true` |
| Rationale | `new Date('2020-01-01') < new Date()` is true |
| Status | PASS (static) |

### S-04 — isOverdue: future dueDate returns false

| Field | Value |
|-------|-------|
| Input | `isOverdue('2099-12-31T00:00:00.000Z', false)` |
| Expected | `false` |
| Rationale | `new Date('2099-12-31') < new Date()` is false |
| Status | PASS (static) |

### S-05 — placeholder: default value renders when prop omitted

| Field | Value |
|-------|-------|
| Scenario | `<DateTimePickerField label="X" value={null} onChange={fn} />` — no placeholder prop |
| Expected | Trigger text shows `"Select date"` |
| Status | PASS (static) — default `= 'Select date'` in destructuring |

### S-06 — placeholder: Turkish value renders when prop supplied

| Field | Value |
|-------|-------|
| Scenario | `TodoFormScreen` renders `DateTimePickerField` with `value={null}` |
| Expected | Trigger text shows `"Tarih seçilmedi"` |
| Status | PASS (static) — explicit prop at `TodoFormScreen.tsx:206` |

### S-07 — All-Day: toggle hidden before date selection

| Field | Value |
|-------|-------|
| Scenario | `TodoFormScreen` opened fresh (create mode); no dueDate selected |
| Expected | "Tum Gun" Switch not visible |
| Status | PASS (static) — `{dueDate && (...)}` renders nothing when `dueDate` is null |

### S-08 — All-Day: toggle visible after date selection

| Field | Value |
|-------|-------|
| Scenario | User picks a date; `dueDate` state becomes non-null |
| Expected | "Tum Gun" Switch appears |
| Status | PASS (static) — conditional renders when `dueDate` truthy |

### S-09 — All-Day: clearing date resets toggle

| Field | Value |
|-------|-------|
| Scenario | User picks date, enables All-Day, then presses the clear (X) button |
| Expected | `allDay` resets to `false`; toggle disappears |
| Status | PASS (static) — `handleDueDateChange(null)` calls `setAllDay(false)` and `setDueDate(null)` |

### S-10 — All-Day: midnight UTC stored on Android

| Field | Value |
|-------|-------|
| Scenario | Android; user picks date 21.03.2026 with All-Day enabled |
| Expected | `onChange` receives `Date` equal to `2026-03-21T00:00:00.000Z` |
| Status | PASS (static) — `buildMidnightUTC` uses `Date.UTC(Y, M, D, 0, 0, 0, 0)` |

### S-11 — All-Day: midnight UTC stored on iOS

| Field | Value |
|-------|-------|
| Scenario | iOS; user picks date, confirms in "Tarih Sec" modal with All-Day enabled |
| Expected | `onChange` receives Date at `T00:00:00.000Z` |
| Status | PASS (static) — iOS `handleIOSConfirm` calls `buildMidnightUTC` when `allDay && phase === 'date'` |

### S-12 — All-Day: time step skipped on Android

| Field | Value |
|-------|-------|
| Scenario | Android; `allDay=true`; user confirms date |
| Expected | `openAndroidTime` is NOT called; only one picker dialog appears |
| Status | PASS (static) — `openAndroidDate` callback takes the `if (allDay)` branch and returns without calling `openAndroidTime` |

### S-13 — All-Day: time step skipped on iOS

| Field | Value |
|-------|-------|
| Scenario | iOS; `allDay=true`; user taps Tamam in date picker |
| Expected | Modal closes immediately; time picker phase never appears |
| Status | PASS (static) — `handleIOSConfirm` calls `setPhase('closed')` after `onChange` when `allDay` is true |

### S-14 — Past-date warning: future date, no alert

| Field | Value |
|-------|-------|
| Scenario | User picks a date in year 2099 |
| Expected | No alert shown |
| Status | PASS (static) — `isOverdue('2099-...', false)` returns false; `Alert.alert` not called |

### S-15 — Past-date warning: past date, alert shown

| Field | Value |
|-------|-------|
| Scenario | User picks a date in year 2020 |
| Expected | Alert with title "Gecmis Tarih" and message about still being saveable |
| Status | PASS (static) — `isOverdue('2020-...', false)` returns true; `Alert.alert` called with correct strings |

### S-16 — Past-date warning: dueDate preserved after alert

| Field | Value |
|-------|-------|
| Scenario | User picks past date, alert fires, user taps "Tamam" |
| Expected | `dueDate` state holds the selected past date |
| Status | PASS (static) — `setDueDate(date)` executes unconditionally before the alert check |

### S-17 — Past-date warning: edit mode open, no automatic alert

| Field | Value |
|-------|-------|
| Scenario | Edit form opened for a todo with `dueDate` in 2020 |
| Expected | No alert on mount |
| Status | PASS (static) — initial state set via `useState(...)` which never calls `handleDueDateChange` |

### S-18 — Toggle notification: completed todo cancels reminder

| Field | Value |
|-------|-------|
| Scenario | User toggles a todo to completed; `onSuccess` fires with `updatedTodo.isCompleted = true` |
| Expected | `notificationService.cancelReminder(updatedTodo.id)` called |
| Status | PASS (static) — line 63 of `useToggleTodo.ts` |

### S-19 — Toggle notification: incomplete todo with future reminder reschedules

| Field | Value |
|-------|-------|
| Scenario | User un-completes a todo; `updatedTodo.isCompleted = false`, `dueDate = '2099-12-31T10:00:00.000Z'`, `reminderOffset = 60` |
| Expected | `notificationService.scheduleReminder(updatedTodo)` called |
| Status | PASS (static) — both conditions met; `fireAt` is in future; line 69 called |

### S-20 — Toggle notification: incomplete todo without reminderOffset skips scheduling

| Field | Value |
|-------|-------|
| Scenario | `updatedTodo.isCompleted = false`, `dueDate = '2099-12-31T10:00:00.000Z'`, `reminderOffset = null` |
| Expected | `scheduleReminder` NOT called |
| Status | PASS (static) — `updatedTodo.reminderOffset != null` is false; else-if branch not entered |

### S-21 — Toggle notification: past fireAt skips scheduling

| Field | Value |
|-------|-------|
| Scenario | `updatedTodo.isCompleted = false`, `dueDate = '2020-01-01T10:00:00.000Z'`, `reminderOffset = 60` |
| Expected | `scheduleReminder` NOT called |
| Status | PASS (static) — `fireAt` is `2019-12-31T09:00Z`; `fireAt > new Date()` is false; line 69 not reached |

### S-22 — Toggle notification: onError does not touch notifications

| Field | Value |
|-------|-------|
| Scenario | API call fails; `onError` callback fires |
| Expected | Neither `cancelReminder` nor `scheduleReminder` is called |
| Status | PASS (static) — `onError` (lines 74–78) only restores cache; no notification calls |

---

## Manual Test Checklist

The following checks require a running device/simulator and cannot be performed by static analysis.

| # | Test | Expected Result |
|---|------|-----------------|
| M-01 | Run `cd mobile && npx tsc --noEmit` | Zero errors |
| M-02 | Launch app; open a todo with a past `dueDate` in `TodoListScreen` | Due date text rendered in red (`colors.delete`) |
| M-03 | Open that todo in `TaskDetailScreen` | Due date icon and text rendered in `colors.delete` |
| M-04 | Create new todo; do not pick a date; observe `DateTimePickerField` | Shows "Tarih seçilmedi" |
| M-05 | Render `DateTimePickerField` without `placeholder` prop in isolation | Shows "Select date" |
| M-06 | Create todo; pick any future date; observe "Tum Gun" toggle appearance | Toggle appears after date selection |
| M-07 | Enable "Tum Gun"; confirm date on iOS | Only date picker shown; modal closes after one confirmation; saved `dueDate` ends in `T00:00:00.000Z` |
| M-08 | Enable "Tum Gun"; confirm date on Android | Single date dialog appears; time dialog does NOT appear; saved `dueDate` ends in `T00:00:00.000Z` |
| M-09 | Enable "Tum Gun"; save todo; check list and detail screens | Task displays only `DD.MM.YYYY` (no time component) |
| M-10 | Select a future date; enable "Tum Gun"; then clear the date using the X button | Toggle disappears; "Tarih seçilmedi" shown again |
| M-11 | Pick a date in the past (e.g. year 2020) | Alert with title "Gecmis Tarih" appears after picker closes |
| M-12 | Dismiss past-date alert; save the form | Form saves successfully; no additional errors |
| M-13 | Open edit form for todo with existing past `dueDate` without touching picker | No alert on screen open |
| M-14 | Toggle a todo with a future reminder to completed; check `AsyncStorage["NOTIFICATION_REGISTRY"]` | Entry for that todo ID is removed from registry |
| M-15 | Un-complete a todo that has future `dueDate` + `reminderOffset`; check registry | New notification identifier appears in registry |
| M-16 | Toggle a todo that has no `reminderOffset`; complete and then revert | No new entry in registry |
| M-17 | Simulate network failure; toggle a todo; observe cache rollback | `isCompleted` reverts to original; no notification side effect |
| M-18 | Run on Expo Go Android; toggle any todo | No crash; silent notification guard active |

---

## Open Items

| # | Item | Risk | Phase |
|---|------|------|-------|
| OI-01 | `allDay` state is not reset to `false` when user re-picks a date while All-Day is already active (not a regression — day is still correctly stored as midnight UTC, but UX could be confusing if user expects to also change the time) | Low | Post v0.10.0 |
| OI-02 | `reminderOffset = 0` (notify exactly at due time) is not offered in the UI but if added in a future sprint, the `!= null` guard in `useToggleTodo.ts` will correctly allow scheduling — no code change needed now | Info | Future sprint |
| OI-03 | `npx tsc --noEmit` not executed in automation — manual run required before merge (M-01) | Medium | Before merge |
| OI-04 | No automated unit test for `isOverdue` utility exists; a Jest unit test in `mobile/tests/` would protect against future signature drift | Low | Next QA sprint |

---

## Conclusion

All five backlog items (BL-001 through BL-005) implemented for v0.10.0 have their acceptance criteria met based on static code analysis. The implementation follows the canonical signatures and patterns defined in `docs/quick-wins-architecture.md`. No regressions were detected in shared utilities, screen rendering logic, mutation hooks, or the notification layer.

Two low-risk observations are noted (OI-01, OI-02) but neither blocks the release. OI-03 (TypeScript compile run) is the only mandatory action before merging.

**Recommendation: Ready for merge pending M-01 (TypeScript build verification).**
