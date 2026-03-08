# Screen List — Todo App

Navigation: React Navigation Native Stack
Background: `LinearGradient` wraps all screens (full-screen gradient, not per-header)

---

## Screen Index

| Screen | Route | Notes |
|--------|-------|-------|
| TaskListScreen | `TaskList` | Initial screen, bottom nav visible |
| CreateTaskScreen | `CreateTask` | Bottom sheet modal over TaskList |
| TaskDetailScreen | `TaskDetail` | Full screen push, nav header visible |

---

## 1. TaskListScreen

**Route:** `TaskList`
**Initial screen:** yes
**Bottom nav:** visible

### Layout

```
┌─────────────────────────────────────────┐
│         LinearGradient background       │
│                                         │
│  ┌───────────────────────────────┬───┐  │
│  │  Search by task title         │ 🔍│  │  ← SearchBar (marginTop: 16)
│  └───────────────────────────────┴───┘  │
│                                         │
│  Tasks List                             │  ← Screen title (20sp, white, bold)
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Client meeting              >    │  │  ← TaskCard
│  │  Tomorrow | 10:30pm               │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Client meeting              >    │  │
│  │  Tomorrow | 10:30pm               │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Client meeting              >    │  │
│  └───────────────────────────────────┘  │
│                                         │
│                            ┌───┐        │
│                            │ + │        │  ← FAB (bottom: 24, right: 16)
│                            └───┘        │
├─────────────────────────────────────────┤
│  🏠    ≡    📅    ⚙️                    │  ← BottomNavBar
└─────────────────────────────────────────┘
```

### States

| State | Condition | Display |
|-------|-----------|---------|
| Loading | Initial data fetch | `ActivityIndicator` (centered) |
| Empty | No tasks | "No tasks yet." centered text (white, muted) |
| Populated | Tasks exist | `FlatList` of `TaskCard` |
| Error | API failure | Error message + retry button |

### Layout Details

- Horizontal padding: `16px` (screen edges)
- SearchBar: `marginTop: 16, marginBottom: 20`
- Screen title: `fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 16`
- FlatList: `paddingBottom: 80` (FAB clearance)
- TaskCard `marginBottom: 10`

### Components Used

- `ScreenGradient` (LinearGradient)
- `SearchBar`
- `FlatList` + `TaskCard` (× n)
- `FloatingActionButton`
- `BottomNavBar`

### Navigation Relationships

| Trigger | Destination | Params |
|---------|-------------|--------|
| FAB press | `CreateTask` (bottom sheet) | none |
| TaskCard press | `TaskDetail` | `{ taskId: string }` |
| BottomNavBar tabs | respective screens | — |

---

## 2. CreateTaskScreen (Bottom Sheet)

**Route:** `CreateTask`
**Presentation:** Bottom sheet modal (slides up over TaskList)
**Bottom nav:** hidden (modal context)

### Layout

```
┌─────────────────────────────────────────┐
│  ░░ TaskListScreen (dimmed background)  │
│  ░░                                     │
│  ░░  Tasks List                         │
│  ░░  ┌──────────────────────────────┐  │
│  ░░  │ Client meeting          >    │  │
│  ░░  └──────────────────────────────┘  │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│                                         │  ← Bottom sheet (white, borderTopRadius: 16)
│  ┌─────────────────────────────────┐    │
│  │ ☑  task                        │    │  ← TaskInput
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ≡  Description                  │    │  ← DescriptionInput (h:140)
│  │                                 │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌───────────────┐ ┌────────────────┐  │
│  │ 📅  Date      │ │ 🕐  Time       │  │  ← DatePickerField + TimePickerField
│  └───────────────┘ └────────────────┘  │
│                                         │
│  ┌───────────────┐ ┌────────────────┐  │
│  │    cancel     │ │    create      │  │  ← SecondaryButton + PrimaryButton
│  └───────────────┘ └────────────────┘  │
└─────────────────────────────────────────┘
```

### Layout Details

- Sheet background: `#FFFFFF`
- Sheet top corners: `borderTopLeftRadius: 16, borderTopRightRadius: 16`
- Sheet padding: `20px` all sides
- Inputs gap: `12px` between fields
- Date+Time row: `flexDirection: 'row', gap: 12`
- Action row: `flexDirection: 'row', gap: 12, marginTop: 16`

### Form Fields

| Field | Required | Placeholder | Validation |
|-------|----------|-------------|------------|
| Task title | yes | "task" | Must not be empty |
| Description | no | "Description" | — |
| Date | no | "Date" | Valid date format |
| Time | no | "Time" | Valid time format |

### Components Used

- `TaskInput`
- `DescriptionInput`
- `DatePickerField`
- `TimePickerField`
- `SecondaryButton` (cancel)
- `PrimaryButton` (create)

### Navigation Relationships

| Trigger | Action |
|---------|--------|
| "cancel" press | Dismiss sheet, return to TaskList |
| "create" success | Dismiss sheet, TaskList reloads |
| Tap outside sheet | Dismiss sheet |
| Swipe down | Dismiss sheet |

---

## 3. TaskDetailScreen

**Route:** `TaskDetail`
**Params:** `{ taskId: string }`
**Bottom nav:** visible
**Header:** native ("< Task Details", white, no background)

### Layout

```
┌─────────────────────────────────────────┐
│  LinearGradient background              │
│                                         │
│  < Task Details                         │  ← Native header (white text, transparent bg)
│                                         │
│  team meeting  ✏                        │  ← EditableTitleHeader (24sp, bold, white)
│                                         │
│  📅 Today   🕐 20:00pm                  │  ← MetaRow (13sp, muted blue-white)
│                                         │
│  ─────────────────────────────────────  │  ← Thin divider (optional, #FFFFFF20)
│                                         │
│  Lorem ipsum is simply dummy text of    │  ← Body text (14sp, white)
│  the printing and typesetting industry  │
│  ...                                    │
│                                         │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │    ✔     │ │    🗑    │ │   📌   │ │  ← ActionButton row
│  │   Done   │ │  Delete  │ │   Pin   │ │
│  └──────────┘ └──────────┘ └─────────┘ │
│                                         │
├─────────────────────────────────────────┤
│  🏠    ≡    📅    ⚙️                    │  ← BottomNavBar
└─────────────────────────────────────────┘
```

### Layout Details

- Horizontal padding: `20px`
- Header: transparent background, white tint color, back button with "< " prefix
- Title top margin: `24px` below header
- MetaRow top margin: `10px` below title
- Body text top margin: `20px` below meta
- ActionButton row: `flexDirection: 'row', justifyContent: 'space-around'` or `gap: 16`
- ActionButton row positioned near bottom (above BottomNavBar), or uses `marginTop: 'auto'`

### Components Used

- `ScreenGradient`
- Native navigation header
- `EditableTitleHeader`
- `MetaRow`
- `Text` (body/description)
- `ActionButton` × 3 (Done, Delete, Pin)
- `BottomNavBar`

### Navigation Relationships

| Trigger | Action |
|---------|--------|
| Back button / "< " | `navigation.goBack()` → TaskListScreen |
| "Done" | Mark complete → update list (optimistic or reload) |
| "Delete" | Confirm dialog → `DELETE /api/todos/:id` → `goBack()` |
| "Pin" | Toggle pin state (future feature) |
| Edit icon (✏) | Inline edit mode or push to EditTaskScreen (future) |

---

## Navigation Graph

```
                 ┌──────────────────────────────────┐
                 │         TaskListScreen            │
                 │   (initialRoute, bottom nav)      │
                 └──────────────┬───────────────────┘
                                │
              ┌─────────────────┼───────────────────┐
              │                 │                   │
          FAB press       TaskCard press       BottomNavBar
              │                 │
              ▼                 ▼
     ┌──────────────┐   ┌───────────────────┐
     │  CreateTask  │   │  TaskDetailScreen │
     │ (Bottom Sheet│   │  (Full push)      │
     │   modal)     │   └────────┬──────────┘
     └──────┬───────┘            │
            │                goBack()
     dismiss/create              │
            │                    ▼
            └───────────→ TaskListScreen
                         (reloads via
                          useFocusEffect)
```

---

## Header Configuration (React Navigation)

### TaskListScreen

```
No native header — screen title "Tasks List" is rendered as a Text component
inside the screen body (below SearchBar).
headerShown: false
```

### CreateTaskScreen

```
Presented as a modal bottom sheet.
headerShown: false
```

### TaskDetailScreen

```
headerShown: true
headerTransparent: true        // gradient shows through
headerTintColor: '#FFFFFF'     // back button white
headerTitle: 'Task Details'
headerTitleStyle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' }
headerBackButtonDisplayMode: 'minimal'  // iOS: icon only
```
