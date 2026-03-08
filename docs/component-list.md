# Component List — Todo App

All components are React Native composites.
Icons: `@expo/vector-icons` (Ionicons / MaterialIcons).
Gradient: `expo-linear-gradient`.

---

## 1. ScreenGradient

Full-screen `LinearGradient` wrapper. Used as the root container on every screen.

```
colors: ['#1B3A7A', '#0A1628']
start/end: top → bottom
flex: 1
```

**Variants:** single
**States:** none
**Notes:** Wraps all screen content. `BottomNavBar` sits inside this at the bottom.

---

## 2. SearchBar

Rounded dark-navy input at the top of TaskListScreen.

```
┌─────────────────────────────┬───┐
│  Search by task title       │ 🔍 │
└─────────────────────────────┴───┘
```

| Property | Value |
|----------|-------|
| background | `#162040` (surfaceInput) |
| borderRadius | 12 |
| height | 48px |
| paddingHorizontal | 16 |
| placeholder color | `#4A6A8A` |
| icon | `Ionicons 'search'`, size 20, color `#4A6A8A` |

**Variants:** single
**States:**

| State | Visual |
|-------|--------|
| `default` | Muted placeholder, search icon right |
| `active` | System focus ring, text color `#FFFFFF` |
| `has-value` | Clear (×) icon appears on right |

---

## 3. TaskCard

Row card displaying a single task in the list.

```
┌────────────────────────────────────────┐
│  Client meeting                    >   │
│  Tomorrow | 10:30pm                    │
└────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| background | `#FFFFFF` |
| borderRadius | 12 |
| paddingVertical | 16 |
| paddingHorizontal | 16 |
| marginBottom | 10 |
| shadow | shadowOpacity 0.15, radius 6, elevation 3 |

**Sub-elements:**

- **Title** — `fontSize: 15, fontWeight: '600', color: '#0A1628'`
- **Meta** — `fontSize: 12, color: '#7A8DA0'` — format: "Tomorrow | 10:30pm"
- **Chevron** — `Ionicons 'chevron-forward'`, size 20, color `#2563EB`

**Variants:** single (all tasks look the same in the list view)

**States:**

| State | Visual |
|-------|--------|
| `default` | White card, full opacity |
| `pressed` | `activeOpacity: 0.85` |
| `completed` | Future: strikethrough title, reduced opacity |

---

## 4. FloatingActionButton (FAB)

Circular button fixed at bottom-right. Opens CreateTask sheet.

| Property | Value |
|----------|-------|
| size | 56 × 56px |
| borderRadius | 9999 (full circle) |
| backgroundColor | `#2563EB` |
| icon | `Ionicons 'add'`, size 28, color `#FFFFFF` |
| position | absolute, bottom: 24, right: 16 |
| shadow | shadowColor `#2563EB`, opacity 0.4, elevation 8 |

**States:**

| State | Behavior |
|-------|----------|
| `default` | Full opacity |
| `pressed` | `activeOpacity: 0.8` |

---

## 5. BottomNavBar

Fixed 4-tab navigation bar at the bottom of all screens.

```
┌──────┬──────┬──────┬──────┐
│  🏠  │  ≡   │  📅  │  ⚙️  │
└──────┴──────┴──────┴──────┘
```

| Property | Value |
|----------|-------|
| background | `#0A1628` |
| height | 60px |
| paddingBottom | safe area inset |

**Tab items:**

| Index | Icon (Ionicons) | Label |
|-------|----------------|-------|
| 0 | `home-outline` / `home` | Home |
| 1 | `list-outline` / `list` | Tasks |
| 2 | `calendar-outline` / `calendar` | Calendar |
| 3 | `settings-outline` / `settings` | Settings |

**States per tab:**

| State | Icon color | Border indicator |
|-------|-----------|-----------------|
| `active` | `#FFFFFF` | none (icon brightens) |
| `inactive` | `#4A6A8A` | none |

---

## 6. TaskInput

Single-line dark input for the task title inside CreateTask sheet.

```
┌──────────────────────────────────────┐
│  ☑  task                             │
└──────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| background | `#162040` |
| borderRadius | 12 |
| height | 52px |
| paddingHorizontal | 16 |
| fontSize | 14sp |
| placeholder | "task", color `#4A6A8A` |
| leadingIcon | `Ionicons 'checkbox-outline'`, size 20, color `#4A6A8A` |

**States:**

| State | Visual |
|-------|--------|
| `default` | Dark bg, muted placeholder |
| `error` | Border `#F44336`, width 1 |
| `focused` | Platform focus ring |
| `disabled` | `editable={false}` |

---

## 7. DescriptionInput

Multiline dark textarea for task description inside CreateTask sheet.

```
┌──────────────────────────────────────┐
│  ≡  Description                      │
│                                      │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| background | `#162040` |
| borderRadius | 12 |
| height | 140px |
| paddingHorizontal | 16 |
| paddingTop | 14 |
| fontSize | 14sp |
| textAlignVertical | `'top'` |
| multiline | true |
| placeholder | "Description", color `#4A6A8A` |
| leadingIcon | `Ionicons 'reorder-three-outline'`, size 20, color `#4A6A8A`, top-aligned |

**States:** same as TaskInput

---

## 8. DatePickerField

Tappable dark field that triggers date selection.

```
┌──────────────────────┐
│  📅  Date            │
└──────────────────────┘
```

| Property | Value |
|----------|-------|
| background | `#162040` |
| borderRadius | 12 |
| height | 48px |
| flex | 1 (left half of row) |
| leadingIcon | `Ionicons 'calendar-outline'`, size 18, color `#4A6A8A` |
| label | "Date" / selected date string |
| fontSize | 14sp, color `#4A6A8A` (empty) / `#FFFFFF` (filled) |

**States:**

| State | Visual |
|-------|--------|
| `empty` | "Date" label, muted color |
| `filled` | Date string, white color |
| `pressed` | Opens native `DateTimePicker` or custom picker |

---

## 9. TimePickerField

Tappable dark field for time selection. Same structure as DatePickerField.

```
┌──────────────────────┐
│  🕐  Time            │
└──────────────────────┘
```

| Property | Value |
|----------|-------|
| leadingIcon | `Ionicons 'time-outline'`, size 18, color `#4A6A8A` |
| label | "Time" / selected time string |
| flex | 1 (right half of row) |

All other properties identical to DatePickerField.

---

## 10. PrimaryButton (Create)

Filled teal-green button for the primary form action.

| Property | Value |
|----------|-------|
| backgroundColor | `#26A69A` |
| borderRadius | 8 |
| height | 52px |
| flex | 1 (right half of action row) |
| label | "create" |
| fontSize | 15sp, fontWeight `'600'`, color `#FFFFFF` |

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| `default` | Teal background | Tappable |
| `loading` | `ActivityIndicator` replaces label, opacity 0.7 | `disabled={true}` |
| `disabled` | Opacity 0.5 | `disabled={true}` |

---

## 11. SecondaryButton (Cancel)

Outlined teal button for cancellation.

| Property | Value |
|----------|-------|
| backgroundColor | `transparent` |
| borderWidth | 1.5 |
| borderColor | `#00BCD4` |
| borderRadius | 8 |
| height | 52px |
| flex | 1 (left half of action row) |
| label | "cancel" |
| fontSize | 15sp, fontWeight `'500'`, color `#00BCD4` |

**States:**

| State | Behavior |
|-------|----------|
| `default` | Tappable |
| `pressed` | `activeOpacity: 0.7` |
| `disabled` | `disabled={true}` while parent is loading |

---

## 12. ActionButton

Square-ish button used on TaskDetailScreen. Dark navy background with colored icon on top and text label below.

```
┌──────────┐
│          │
│    ✔     │
│   Done   │
└──────────┘
```

| Property | Value |
|----------|-------|
| background | `#162040` |
| borderRadius | 12 |
| width | ~80px |
| paddingVertical | 14 |
| paddingHorizontal | 12 |
| alignItems | `'center'` |
| gap | 8 (icon to label) |
| shadow | shadowOpacity 0.2, elevation 2 |

**Variants:**

| Variant | Icon | Icon color | Label |
|---------|------|-----------|-------|
| `done` | `Ionicons 'checkmark-circle'`, size 28 | `#4CAF50` | "Done" |
| `delete` | `Ionicons 'trash'`, size 28 | `#F44336` | "Delete" |
| `pin` | `Ionicons 'push-pin'` or `MaterialIcons 'push-pin'`, size 28 | `#FFC107` | "Pin" |

**Label:** `fontSize: 12, fontWeight: '500', color: '#FFFFFF'`, `marginTop: 8`

**States:**

| State | Behavior |
|-------|----------|
| `default` | Full opacity |
| `pressed` | `activeOpacity: 0.75` |

---

## 13. MetaRow

Displays date + time metadata with icons. Used on TaskDetailScreen.

```
📅 Today   🕐 20:00pm
```

| Property | Value |
|----------|-------|
| flexDirection | `'row'` |
| gap | 16 |
| icon size | 14 |
| icon color | `#8FA8C8` |
| text | `fontSize: 13, color: '#8FA8C8'` |

---

## 14. EditableTitleHeader

Task title on DetailScreen with inline edit icon.

```
team meeting  ✏
```

| Property | Value |
|----------|-------|
| title fontSize | 24sp, fontWeight `'700'`, color `#FFFFFF` |
| edit icon | `Ionicons 'pencil'`, size 18, color `#8FA8C8` |
| layout | `flexDirection: 'row', alignItems: 'center', gap: 10` |

---

## Component Dependency Map

```
App
├── LinearGradient (ScreenGradient)
│   ├── TaskListScreen
│   │   ├── SearchBar
│   │   ├── FlatList
│   │   │   └── TaskCard (× n)
│   │   ├── FloatingActionButton
│   │   └── [CreateTaskSheet — modal overlay]
│   │       ├── TaskInput
│   │       ├── DescriptionInput
│   │       ├── DatePickerField
│   │       ├── TimePickerField
│   │       └── ActionRow
│   │           ├── SecondaryButton (cancel)
│   │           └── PrimaryButton (create)
│   │
│   ├── TaskDetailScreen
│   │   ├── EditableTitleHeader
│   │   ├── MetaRow
│   │   ├── BodyText (description)
│   │   └── ActionRow
│   │       ├── ActionButton (done)
│   │       ├── ActionButton (delete)
│   │       └── ActionButton (pin)
│   │
│   └── BottomNavBar (fixed, all screens)
```
