# Feature: v0.10.0 — Quick Wins

Version: 1.0
Date: 2026-03-21
Author: Product Manager Agent
Status: Draft
Target Release: v0.10.0

---

## Overview

Five small, self-contained improvements targeting the `mobile/src` layer exclusively.
No backend API contract changes. All items build on infrastructure already shipped in
v0.5.0 (Local Reminders) and v0.9.0 (Native DateTime Picker).

| BL-ID  | Title                              | Area               |
|--------|------------------------------------|--------------------|
| BL-005 | `isOverdue` Utility Extraction     | Code Quality       |
| BL-004 | `DateTimePickerField` Placeholder Prop | Component API  |
| BL-001 | All-Day Mode                       | DateTime Picker    |
| BL-002 | Past-Date Warning                  | DateTime Picker    |
| BL-003 | Toggle → Notification Cancellation | Notifications      |

---

## BL-005 — `isOverdue` Utility Extraction

### Overview

The helper function `isOverdue(dueDate, isCompleted)` is currently duplicated verbatim
in both `TodoListScreen` and `TaskDetailScreen`. Moving it to a shared utility module
(`mobile/src/utils/isOverdue.ts`) follows the same pattern already established by
`formatDate.ts` and eliminates the risk of the two copies diverging over time.
Behavior does not change.

### User Story

As a developer, I want `isOverdue` to live in a single utility file, so that any
future behavior fix is applied in one place and both screens stay consistent.

### Functional Requirements

- FR-BL005-1: A new file `mobile/src/utils/isOverdue.ts` is created, exporting a named
  function `isOverdue(dueDate: string | null | undefined, isCompleted: boolean): boolean`.
- FR-BL005-2: The function's logic is identical to the current inline implementations
  in both screens (no behavioral change).
- FR-BL005-3: `TodoListScreen` removes its local `isOverdue` definition and imports the
  utility instead.
- FR-BL005-4: `TaskDetailScreen` removes its local `isOverdue` definition and imports
  the utility instead.
- FR-BL005-5: No other files are modified.

### Acceptance Criteria

- [ ] `mobile/src/utils/isOverdue.ts` exists and exports a named function `isOverdue`.
- [ ] `TodoListScreen.tsx` contains no inline definition of `isOverdue`; it imports from
  `../utils/isOverdue`.
- [ ] `TaskDetailScreen.tsx` contains no inline definition of `isOverdue`; it imports from
  `../utils/isOverdue`.
- [ ] `npx tsc --noEmit` passes with no new errors.
- [ ] Overdue highlighting behavior on `TodoListScreen` is unchanged.
- [ ] Overdue highlighting behavior on `TaskDetailScreen` is unchanged.

---

## BL-004 — `DateTimePickerField` Placeholder Prop

### Overview

`DateTimePickerField` currently renders a hard-coded Turkish string as the placeholder
text shown when no date is selected. Replacing this with a `placeholder?: string` prop
makes the component reusable in any screen or locale without forking the file.

### User Story

As a developer, I want to pass a custom placeholder string to `DateTimePickerField`,
so that the component can be reused across different screens and languages without
modifying its source.

### Functional Requirements

- FR-BL004-1: `DateTimePickerFieldProps` gains an optional `placeholder?: string` field.
- FR-BL004-2: The default value for `placeholder` is `"Select date"`.
- FR-BL004-3: The component renders the `placeholder` prop value (or its default) when
  `value` is `null`.
- FR-BL004-4: All existing call sites (`TodoFormScreen`) are updated to pass an explicit
  `placeholder` string that preserves the current Turkish text shown to the user
  (i.e., the visible UI text does not change in the shipped app).
- FR-BL004-5: No other component behaviour is modified.

### Acceptance Criteria

- [ ] `DateTimePickerFieldProps` includes `placeholder?: string`.
- [ ] When `placeholder` is not passed, the component renders `"Select date"`.
- [ ] When `TodoFormScreen` passes the existing Turkish placeholder text, that text is
  shown to the user — the visible experience is unchanged from v0.9.0.
- [ ] `npx tsc --noEmit` passes with no new errors.
- [ ] No other props or behaviors of `DateTimePickerField` are altered.

---

## BL-001 — All-Day Mode

### Overview

When creating or editing a task, users sometimes want to set a due date without
committing to a specific time (e.g., "finish this by Friday"). An **All-Day** toggle
in `TodoFormScreen` lets the user skip the time-selection phase entirely. When active,
`dueDate` is stored as midnight UTC (`T00:00:00.000Z`) and only the date portion is
displayed — behaviour that `formatDate` already supports (it omits time when UTC hours
and minutes are both zero, per `docs/datetime-picker-spec.md` FR-6 / FR-7).

### User Stories

**US-BL001-1 — Skip time selection**
As a user, I want to activate an "All Day" toggle when selecting a due date, so that I
can skip the time step and record only the calendar date.

**US-BL001-2 — Date-only display**
As a user, I want tasks saved in All-Day mode to show only the date (no time) in the
task list and detail screen, so that the display matches my intent.

### Functional Requirements

- FR-BL001-1: `TodoFormScreen` renders an "All Day" toggle switch. The toggle is only
  enabled (tappable) when a `dueDate` is selected; it is disabled and visually inactive
  when `dueDate` is `null`.
- FR-BL001-2: `DateTimePickerField` accepts an `allDay?: boolean` prop. When `allDay`
  is `true` the picker flow stops after the date phase; the time phase is not presented.
- FR-BL001-3: When the user confirms the date in All-Day mode, the resulting `dueDate`
  value is set to midnight UTC of the selected calendar date (`T00:00:00.000Z`).
- FR-BL001-4: When `dueDate` is cleared (set to `null`), the All-Day toggle resets to
  `false` automatically.
- FR-BL001-5: `TodoListScreen` and `TaskDetailScreen` display only `DD.MM.YYYY` for
  All-Day tasks. This follows the existing `formatDate` rule (UTC 00:00 → date only)
  and requires no changes to `formatDate.ts`.
- FR-BL001-6: The `allDay` state is local to `TodoFormScreen`; it is not persisted to
  the backend or stored as a separate field. The All-Day contract is encoded entirely in
  the `dueDate` value (`T00:00:00.000Z`).
- FR-BL001-7: Switching the toggle off while a date is selected re-opens the picker at
  the time-selection phase so the user can choose a time.

### Acceptance Criteria

- [ ] An "All Day" toggle is visible in `TodoFormScreen` when a `dueDate` is selected.
- [ ] The toggle is disabled when `dueDate` is `null`.
- [ ] Activating the toggle and saving stores `dueDate` as `T00:00:00.000Z` on the
  selected calendar day.
- [ ] With All-Day mode active, the picker does not present the time step on either
  iOS or Android.
- [ ] `TodoListScreen` shows only `DD.MM.YYYY` for an All-Day task (no time component).
- [ ] `TaskDetailScreen` shows only `DD.MM.YYYY` for an All-Day task.
- [ ] Clearing `dueDate` while All-Day is active resets the toggle to `false`.
- [ ] `npx tsc --noEmit` passes with no new errors.

---

## BL-002 — Past-Date Warning

### Overview

After the picker closes, if the selected `dueDate` is earlier than the current moment,
an informational `Alert` is shown. This is a soft warning — the user can still save the
task with a past due date. No input is blocked. The feature feeds naturally from the
`isOverdue` utility introduced in BL-005.

### User Stories

**US-BL002-1 — Soft warning on past selection**
As a user, after I pick a date/time that has already passed, I want to see a brief
warning message, so that I am aware I have selected a past date before saving.

**US-BL002-2 — No hard block**
As a user, I want to be able to dismiss the warning and still save the task with the
past date, so that I retain full control over my data entry.

### Functional Requirements

- FR-BL002-1: The warning check is triggered immediately after the picker closes with
  a confirmed value (i.e., after `dueDate` is set in form state), not on every render.
- FR-BL002-2: The check compares the selected `dueDate` to `new Date()` at the moment
  the picker closes.
- FR-BL002-3: If the selected date is in the past, an `Alert` is displayed with a
  single dismissal button. The alert is informational; it does not modify `dueDate`.
- FR-BL002-4: The warning is not shown when editing an existing task that already had
  a past `dueDate` before the user opened the form (i.e., alert fires only on a fresh
  picker selection within the current form session).
- FR-BL002-5: All-Day mode (BL-001) is compatible: when the user selects a past
  calendar day in All-Day mode, the same alert is shown.

### Acceptance Criteria

- [ ] Selecting a future date via the picker produces no alert.
- [ ] Selecting a past date/time via the picker triggers an `Alert` immediately after
  the picker closes.
- [ ] Dismissing the alert leaves `dueDate` set to the chosen past value.
- [ ] The user can save the task after dismissing the alert.
- [ ] Opening an existing task with a past `dueDate` (without touching the picker) does
  not show the alert.
- [ ] The alert fires for past All-Day selections as well.
- [ ] `npx tsc --noEmit` passes with no new errors.

---

## BL-003 — Toggle → Notification Cancellation

### Overview

When a task is marked complete (`isCompleted = true`), any pending local notification
for that task should be automatically cancelled — there is nothing left to remind the
user about. If the task is later unchecked (`isCompleted = false`) and both `dueDate`
and `reminderOffset` are still present and in the future, the reminder is rescheduled.
`notificationRegistry` (shipped in v0.5.0) already maintains the `todoId → notificationIdentifier`
mapping needed to perform the cancellation.

### User Stories

**US-BL003-1 — Auto-cancel on completion**
As a user, when I mark a task as done, I want its pending notification to be cancelled
automatically, so that I do not receive a reminder for a task I have already completed.

**US-BL003-2 — Reschedule on uncheck**
As a user, when I uncheck a completed task that still has a future due date and a
reminder offset, I want the reminder to be rescheduled automatically, so that I do not
have to re-open the form to restore my reminder.

### Functional Requirements

- FR-BL003-1: After `useToggleTodo` receives a successful response from the API with
  `isCompleted = true`, `cancelReminder(todoId)` from `notificationService` is called
  for that todo's ID.
- FR-BL003-2: After `useToggleTodo` receives a successful response with
  `isCompleted = false`, if the updated todo has both a non-null `dueDate` and a
  non-null `reminderOffset`, and the computed reminder time is in the future,
  `scheduleReminder(todo)` from `notificationService` is called.
- FR-BL003-3: If `notificationService` is unavailable (Expo Go Android guard already
  in place), the toggle mutation behaves identically to its current behaviour — no
  crash, no user-visible error.
- FR-BL003-4: The cancellation/rescheduling logic runs in `onSuccess` of
  `useToggleTodo`, after the query cache has been updated with the definitive server
  value.
- FR-BL003-5: The optimistic rollback path (`onError`) does not trigger any
  notification changes.

### Acceptance Criteria

- [ ] Toggling a task to `isCompleted = true` calls `cancelReminder` for that task ID.
- [ ] After cancellation, the notification no longer fires (verified by checking that
  the notification ID is removed from `notificationRegistry`).
- [ ] Toggling a task back to `isCompleted = false` with a future `dueDate` +
  `reminderOffset` calls `scheduleReminder` and creates a new registry entry.
- [ ] Toggling a task back to `isCompleted = false` when `dueDate` is `null` or
  `reminderOffset` is `null` does NOT call `scheduleReminder`.
- [ ] A toggle that fails (network error, rollback) does not cancel or reschedule any
  notification.
- [ ] On Expo Go Android the toggle mutation completes without crashing.
- [ ] `npx tsc --noEmit` passes with no new errors.

---

## Out of Scope

| Item | Reason |
|------|--------|
| Backend API changes | All five items are frontend-only; `dueDate` and `reminderOffset` contracts are unchanged |
| Persisting `allDay` as a dedicated field | All-Day state is encoded in `T00:00:00.000Z`; no schema migration required |
| Hard-blocking past-date entry | BL-002 is informational only; the user retains control |
| Timezone conversion or locale detection | Standard `Date` API is sufficient; consistent with existing `formatDate.ts` |
| Push notifications (remote) | `notificationService` is local-only; push infrastructure is a future item |
| Deep-link on notification tap | Listed as Faz 2 in `docs/notifications-architecture.md` |
| New unit/E2E test suite | Test scenarios are defined separately by the Tester Agent |
| Navigation or routing changes | No new screens; no changes to `RootStackParamList` |

---

## Dependencies

| Dependency | Notes |
|------------|-------|
| `docs/datetime-picker-spec.md` | BL-001 and BL-002 extend the picker introduced in v0.9.0 |
| `docs/notifications-architecture.md` | BL-003 relies on `notificationRegistry` and `notificationService` from v0.5.0 |
| BL-005 → BL-002 | BL-002 may reuse `isOverdue` logic; BL-005 should be completed first |
| BL-004 → BL-001 | BL-001 adds `allDay` prop to `DateTimePickerField`; BL-004 adds `placeholder` prop — both modify the same component and should be coordinated |

---

## Affected Files Summary

| File | BL Items | Change Type |
|------|----------|-------------|
| `mobile/src/utils/isOverdue.ts` | BL-005 | New file |
| `mobile/src/screens/TodoListScreen.tsx` | BL-005 | Import swap (remove inline fn) |
| `mobile/src/screens/TaskDetailScreen.tsx` | BL-005 | Import swap (remove inline fn) |
| `mobile/src/components/DateTimePickerField.tsx` | BL-004, BL-001 | Prop additions (`placeholder`, `allDay`) |
| `mobile/src/screens/TodoFormScreen.tsx` | BL-004, BL-001, BL-002 | Prop pass-through, All-Day toggle, past-date alert |
| `mobile/src/mutations/useToggleTodo.ts` | BL-003 | `onSuccess` side-effect additions |
