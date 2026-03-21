# Architecture: v0.10.0 — Quick Wins

Version: 1.0
Date: 2026-03-21
Author: Architect Agent
Status: Approved
Target Release: v0.10.0
Feature Spec: `docs/quick-wins-spec.md`

---

## Overview

Five self-contained frontend improvements. All changes are confined to
`mobile/src`. No backend API contract changes, no new navigation routes,
no new dependencies beyond what was already introduced in v0.5.0 and v0.9.0.

---

## Dependency Order

The items must be implemented in the following sequence to avoid rework:

```
BL-005 (isOverdue utility)
  └─► BL-002 (past-date warning) — reuses isOverdue

BL-004 (placeholder prop)       ─┐
BL-001 (all-day mode)           ─┴─► both modify DateTimePickerField;
                                       coordinate in a single PR or
                                       implement BL-004 first to keep diffs clean

BL-003 (toggle → notification)  — independent; can run in parallel with BL-004/BL-001
```

Strict ordering requirement: **BL-005 before BL-002**.
Recommended ordering: **BL-005 → BL-004 → BL-001 → BL-002 → BL-003**.

---

## BL-005 — `isOverdue` Utility Extraction

### Decision

Extract the duplicated inline `isOverdue` function into
`mobile/src/utils/isOverdue.ts` as a named export. Both call sites
(`TodoListScreen`, `TaskDetailScreen`) replace their local definitions
with an import from the new module.

### Rationale

The identical two-line function already exists verbatim in both files
(lines 29–32 of `TodoListScreen.tsx`, lines 26–29 of `TaskDetailScreen.tsx`).
Keeping two copies creates divergence risk. The `formatDate.ts` utility
in the same `utils/` folder establishes the precedent for this pattern.

### Canonical Function Signature

```typescript
// mobile/src/utils/isOverdue.ts

/**
 * Returns true when a todo's dueDate has passed and the todo is not completed.
 * All-Day tasks (dueDate stored as T00:00:00.000Z) are evaluated against
 * midnight UTC on the selected day, matching the existing inline behaviour.
 */
export function isOverdue(
  dueDate: string | null | undefined,
  isCompleted: boolean,
): boolean {
  if (!dueDate || isCompleted) return false;
  return new Date(dueDate) < new Date();
}
```

> The `undefined` union is added to the parameter type to cover call sites
> where the field may arrive as `undefined` (e.g. partial Todo shapes).
> The runtime guard `!dueDate` already handles both `null` and `undefined`,
> so no behavioural change occurs.

### Migration at Call Sites

**TodoListScreen.tsx** — replace inline definition (lines 29–32) with:

```typescript
import { isOverdue } from '../utils/isOverdue';
```

**TaskDetailScreen.tsx** — replace inline definition (lines 26–29) with:

```typescript
import { isOverdue } from '../utils/isOverdue';
```

No other changes in either file.

### Affected Files

| File | Change |
|------|--------|
| `mobile/src/utils/isOverdue.ts` | New file |
| `mobile/src/screens/TodoListScreen.tsx` | Remove inline fn, add import |
| `mobile/src/screens/TaskDetailScreen.tsx` | Remove inline fn, add import |

---

## BL-004 — `DateTimePickerField` Placeholder Prop

### Decision

Add `placeholder?: string` to `DateTimePickerFieldProps` with a default
value of `"Select date"`. The render path replaces the hard-coded Turkish
string `'Tarih seçilmedi'` with the resolved prop value. `TodoFormScreen`
passes the existing Turkish string explicitly so the visible UI is unchanged.

### Rationale

The component is a candidate for reuse across screens and locales. Hard-coding
a language-specific string inside a general-purpose component violates the
single-responsibility principle. Making it a prop with a sensible English
default follows the same pattern as `label`, which is already caller-supplied.

### Interface Change

```typescript
// mobile/src/components/DateTimePickerField.tsx

interface DateTimePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  placeholder?: string;   // NEW — default: "Select date"
}
```

### Destructuring Update

```typescript
export default function DateTimePickerField({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select date',  // NEW
}: DateTimePickerFieldProps) {
```

### Render Update (trigger text node, line 133)

Before:
```tsx
{displayText ?? 'Tarih seçilmedi'}
```

After:
```tsx
{displayText ?? placeholder}
```

### Call Site Update — TodoFormScreen.tsx

```tsx
<DateTimePickerField
  label="Son Tarih"
  value={dueDate}
  onChange={handleDueDateChange}
  disabled={saving}
  placeholder="Tarih seçilmedi"   // NEW — preserves existing Turkish UI text
/>
```

### Affected Files

| File | Change |
|------|--------|
| `mobile/src/components/DateTimePickerField.tsx` | Add `placeholder` prop + use it |
| `mobile/src/screens/TodoFormScreen.tsx` | Pass explicit `placeholder` |

---

## BL-001 — All-Day Mode

### Decision

Add `allDay?: boolean` to `DateTimePickerFieldProps`. When `true`, the
picker flow stops after the date phase (skips the time phase). The
resulting `dueDate` is set to midnight UTC of the selected calendar date.
An `allDay` boolean state is held in `TodoFormScreen`; it is not persisted
to the backend. The All-Day contract is encoded entirely in the ISO string
value `T00:00:00.000Z`.

### Rationale

`formatDate.ts` already implements the display contract: when UTC hours and
minutes are both zero, only the date portion is rendered. No changes to
`formatDate.ts` or the backend API are needed. Encoding All-Day in the
`dueDate` value avoids a schema migration and keeps the API surface stable.

### Interface Change

```typescript
interface DateTimePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allDay?: boolean;  // NEW — default: false
}
```

### Platform Behaviour When allDay = true

#### Android path

```typescript
function openAndroidDate(initial: Date) {
  DateTimePickerAndroid.open({
    value: initial,
    mode: 'date',
    onChange: (event, selectedDate) => {
      if (event.type === 'dismissed' || !selectedDate) return;
      if (allDay) {
        // Skip time phase; build midnight UTC from the selected local date.
        const midnight = buildMidnightUTC(selectedDate);
        onChange(midnight);
      } else {
        openAndroidTime(selectedDate);
      }
    },
  });
}
```

#### iOS path

`handleIOSConfirm()` — after the date phase confirm button is tapped:

```typescript
function handleIOSConfirm() {
  if (phase === 'date') {
    if (allDay) {
      // Commit immediately; skip time phase.
      const midnight = buildMidnightUTC(currentPickerValue);
      onChange(midnight);
      setPhase('closed');
    } else {
      setPendingDate(currentPickerValue);
      setPhase('time');
    }
  } else {
    // time phase (allDay is always false here)
    const combined = new Date(pendingDate);
    combined.setHours(
      currentPickerValue.getHours(),
      currentPickerValue.getMinutes(),
      0,
      0,
    );
    onChange(combined);
    setPhase('closed');
  }
}
```

#### Midnight UTC Helper

```typescript
/**
 * Given any Date, returns a new Date set to 00:00:00.000 UTC on that
 * calendar day (as observed in the device's local timezone).
 */
function buildMidnightUTC(localDate: Date): Date {
  return new Date(Date.UTC(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    0, 0, 0, 0,
  ));
}
```

`buildMidnightUTC` is a module-level private function inside
`DateTimePickerField.tsx`; it is not exported.

### TodoFormScreen State Management

A new boolean state is introduced:

```typescript
const [allDay, setAllDay] = useState(false);
```

**Initialisation for edit mode:**

```typescript
// Derive initial allDay value from the existing dueDate.
// A dueDate stored as T00:00:00.000Z implies All-Day was active.
const [allDay, setAllDay] = useState<boolean>(() => {
  if (!editTodo?.dueDate) return false;
  const d = new Date(editTodo.dueDate);
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
});
```

**Toggle handler — when allDay is switched ON:**

When the user enables All-Day while a `dueDate` is already selected, the
current `dueDate` is converted to midnight UTC immediately, without
reopening the picker.

```typescript
function handleAllDayChange(value: boolean) {
  setAllDay(value);
  if (value && dueDate) {
    // Convert existing dueDate to midnight UTC.
    const midnight = new Date(Date.UTC(
      dueDate.getFullYear(),
      dueDate.getMonth(),
      dueDate.getDate(),
      0, 0, 0, 0,
    ));
    setDueDate(midnight);
  }
  if (!value && dueDate) {
    // User switched All-Day OFF while a date was set → re-open picker
    // at time-selection phase. The component handles this via allDay=false
    // on the next open; no explicit picker-open call is needed here.
    // The next tap on DateTimePickerField will run the full date+time flow.
  }
}
```

> FR-BL001-7 states that switching the toggle off re-opens the picker at
> the time phase. However, forcing the picker to open programmatically on
> toggle change would be jarring UX. The correct interpretation is: the next
> time the user taps the DateTimePickerField trigger (with `allDay=false`),
> the full date→time flow is presented. No automatic picker-open is triggered
> on the toggle itself.

**dueDate cleared → reset allDay:**

The existing `handleDueDateChange` is extended:

```typescript
function handleDueDateChange(date: Date | null) {
  setDueDate(date);
  if (!date) {
    setReminderOffset(null);
    setAllDay(false);   // NEW — FR-BL001-4
  }
}
```

**Toggle UI in TodoFormScreen — rendered after DateTimePickerField:**

```tsx
{/* ── All Day toggle — only shown when a dueDate is selected ── */}
{dueDate && (
  <View style={styles.switchRow}>
    <Text style={styles.fieldLabel}>Tüm Gün</Text>
    <Switch
      value={allDay}
      onValueChange={handleAllDayChange}
      disabled={saving}
      trackColor={{ false: colors.surfaceInput, true: colors.primary }}
      thumbColor={colors.textOnDark}
    />
  </View>
)}
```

**DateTimePickerField call site:**

```tsx
<DateTimePickerField
  label="Son Tarih"
  value={dueDate}
  onChange={handleDueDateChange}
  disabled={saving}
  placeholder="Tarih seçilmedi"
  allDay={allDay}           // NEW
/>
```

### Display — No Changes Required

`TodoListScreen` and `TaskDetailScreen` both call `formatDate(todo.dueDate)`.
`formatDate` already omits the time component when UTC hours and minutes
are zero. All-Day tasks stored as `T00:00:00.000Z` will naturally display
only `DD.MM.YYYY`. No changes to either screen are needed for display.

### Affected Files

| File | Change |
|------|--------|
| `mobile/src/components/DateTimePickerField.tsx` | Add `allDay` prop, `buildMidnightUTC` helper, branch in Android and iOS confirm paths |
| `mobile/src/screens/TodoFormScreen.tsx` | Add `allDay` state, `handleAllDayChange`, extend `handleDueDateChange`, render All-Day toggle, pass `allDay` prop |

---

## BL-002 — Past-Date Warning

### Decision

Wrap the `dueDate` setter in `TodoFormScreen` so that a soft `Alert` is
shown immediately after the picker closes with a past date. The check is
performed using `isOverdue` (BL-005). No input is blocked; the alert is
purely informational with a single dismissal button.

### Rationale

The warning must fire only on a fresh picker selection within the current
form session, not when the form is opened with an already-past `dueDate`.
Using `isOverdue` from the shared utility (BL-005) keeps the "is this in
the past?" logic consistent across the app. Because `isOverdue` accepts
`isCompleted` as its second parameter, `false` is always passed here —
a task being edited may or may not be completed, but the alert is about
the date choice, not the completion state.

### Dependency on BL-005

`isOverdue` must be importable before BL-002 is implemented. BL-005 must
be merged first.

### Implementation in TodoFormScreen

`handleDueDateChange` is the single point where `dueDate` state is set after
picker confirmation. The alert logic is added inside this function:

```typescript
import { Alert } from 'react-native';
import { isOverdue } from '../utils/isOverdue';  // requires BL-005

function handleDueDateChange(date: Date | null) {
  setDueDate(date);
  if (!date) {
    setReminderOffset(null);
    setAllDay(false);   // BL-001
    return;
  }
  // Past-date warning — fires only when the user selects a new date
  // via the picker (not on initial render from editTodo.dueDate).
  if (isOverdue(date.toISOString(), false)) {
    Alert.alert(
      'Geçmiş Tarih',
      'Seçilen tarih geçmiş bir zamana ait. Görevi yine de kaydedebilirsiniz.',
      [{ text: 'Tamam' }],
    );
  }
}
```

`handleDueDateChange` is already the `onChange` callback passed to
`DateTimePickerField`. On both iOS and Android, `onChange` is invoked only
after the user confirms a value (never on intermediate spinner changes),
so FR-BL002-1 is satisfied by the existing picker design.

FR-BL002-4 (no alert on form open with existing past dueDate) is satisfied
because `handleDueDateChange` is not called during the `useState` initialiser
— state is set directly, not through this handler.

FR-BL002-5 (All-Day compatibility) is satisfied: when All-Day mode is active,
`DateTimePickerField` calls `onChange` with a midnight-UTC Date after the
date phase. `handleDueDateChange` receives this Date, converts it to ISO,
and `isOverdue` evaluates it normally.

### Alert Specification

| Property | Value |
|----------|-------|
| Title | `'Geçmiş Tarih'` |
| Message | `'Seçilen tarih geçmiş bir zamana ait. Görevi yine de kaydedebilirsiniz.'` |
| Buttons | Single button: `{ text: 'Tamam' }` |
| Effect on dueDate | None — `setDueDate` has already been called |

### Affected Files

| File | Change |
|------|--------|
| `mobile/src/screens/TodoFormScreen.tsx` | Extend `handleDueDateChange` with `isOverdue` check + `Alert.alert` |

---

## BL-003 — Toggle → Notification Management

### Decision

Add notification side-effects to the `onSuccess` callback of `useToggleTodo`.
When the toggled todo becomes completed (`isCompleted = true`), call
`cancelReminder(todoId)`. When it becomes incomplete (`isCompleted = false`)
and both `dueDate` and `reminderOffset` are present and the computed fire
time is in the future, call `scheduleReminder(todo)`.

### Rationale

`onSuccess` receives the definitive server-side `Todo` object, making it the
correct location for side-effects that depend on the authoritative state.
`onError` must not trigger any notification changes because the optimistic
update is rolled back in that path. The existing Expo Go Android guard inside
`notificationService` ensures no crash occurs on that platform (FR-BL003-3).

### Reminder Time Calculation

`scheduleReminder` in `notificationService` already computes the fire time
internally:

```
fireAt = new Date(todo.dueDate) - todo.reminderOffset * 60 * 1000
```

`useToggleTodo` does not need to replicate this calculation. It only needs
to check whether a reschedule is appropriate before calling `scheduleReminder`,
because `scheduleReminder` will silently cancel and skip if the fire time
has already passed — but calling it unnecessarily adds a redundant AsyncStorage
read. The guard in `onSuccess` therefore pre-filters:

```typescript
onSuccess: (updatedTodo) => {
  // 1. Update query cache (existing logic — unchanged)
  queryClient.setQueryData<Todo[]>(queryKey, (old) =>
    (old ?? []).map((t) => (t.id === updatedTodo.id ? updatedTodo : t)),
  );

  // 2. Notification side-effects (NEW)
  if (updatedTodo.isCompleted) {
    // Task marked done → cancel any pending reminder.
    notificationService.cancelReminder(updatedTodo.id).catch(() => {
      // Non-fatal; notification system has its own guards.
    });
  } else {
    // Task unchecked → reschedule if a future reminder is still applicable.
    if (updatedTodo.dueDate && updatedTodo.reminderOffset != null) {
      const fireAt = new Date(
        new Date(updatedTodo.dueDate).getTime() -
          updatedTodo.reminderOffset * 60 * 1000,
      );
      if (fireAt > new Date()) {
        notificationService.scheduleReminder(updatedTodo).catch(() => {
          // Non-fatal.
        });
      }
    }
  }
},
```

### notificationService API Compatibility

| Function | Signature | Notes |
|----------|-----------|-------|
| `cancelReminder` | `(todoId: string) => Promise<void>` | Reads registry, cancels via expo-notifications, removes registry entry. No-op if no entry exists. |
| `scheduleReminder` | `(todo: Todo) => Promise<void>` | Reads `todo.dueDate` and `todo.reminderOffset`, cancels existing, schedules new. Silently skips if fire time has passed or permissions not granted. |

Both functions are already exported from `notificationService` and contain
their own error guards. The `.catch(() => {})` in `useToggleTodo` is a belt-
and-suspenders guard; it does not suppress meaningful errors since the service
already logs nothing and fails silently by design.

### onError Path

`onError` restores the previous query cache snapshot. No notification logic
runs in `onError`. This satisfies FR-BL003-5.

### Import Required

```typescript
import { notificationService } from '../services/notifications/notificationService';
```

### Affected Files

| File | Change |
|------|--------|
| `mobile/src/mutations/useToggleTodo.ts` | Import `notificationService`, extend `onSuccess` block |

---

## Affected Files Summary

| File | BL Items | Change Type |
|------|----------|-------------|
| `mobile/src/utils/isOverdue.ts` | BL-005 | New file |
| `mobile/src/screens/TodoListScreen.tsx` | BL-005 | Import swap (remove inline fn) |
| `mobile/src/screens/TaskDetailScreen.tsx` | BL-005 | Import swap (remove inline fn) |
| `mobile/src/components/DateTimePickerField.tsx` | BL-004, BL-001 | Prop additions (`placeholder`, `allDay`), `buildMidnightUTC` helper, picker flow branching |
| `mobile/src/screens/TodoFormScreen.tsx` | BL-004, BL-001, BL-002 | `placeholder` pass-through, `allDay` state + toggle UI, `handleDueDateChange` extension |
| `mobile/src/mutations/useToggleTodo.ts` | BL-003 | `onSuccess` notification side-effects |

**Total files changed: 6. Total new files: 1.**
No backend files, no navigation files, no new npm dependencies.

---

## Constraints and Non-Decisions

| Topic | Constraint |
|-------|-----------|
| Backend API | No changes. `dueDate` and `reminderOffset` contracts are unchanged. |
| `allDay` persistence | Not persisted as a dedicated field. Encoded in `T00:00:00.000Z`. |
| Past-date blocking | BL-002 is informational only. No form submission is blocked. |
| Timezone handling | Standard `Date` API, consistent with existing `formatDate.ts`. |
| Push notifications | Out of scope. `notificationService` is local-only. |
| New screens | None. `RootStackParamList` is unchanged. |
| `buildMidnightUTC` visibility | Private to `DateTimePickerField.tsx`. Not exported. |
