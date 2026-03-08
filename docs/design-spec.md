# Design Specification — Todo App

Implementation guide for the Frontend Developer.
All values are React Native StyleSheet compatible.
Icons: `@expo/vector-icons` (Ionicons). Gradient: `expo-linear-gradient`.

---

## Global Rules

| Rule | Value |
|------|-------|
| Screen background | `LinearGradient` `['#1B3A7A', '#0A1628']`, full-screen, all screens |
| Safe area | `SafeAreaView` or `useSafeAreaInsets` for bottom nav + status bar |
| Screen padding | `paddingHorizontal: 16` as default |
| Status bar | `style="light"` (white icons on dark background) |
| Font | System default (no custom font load needed) |

---

## Screen: TaskListScreen

### Header Area (no native header)

```
headerShown: false

Screen title (Text component in body):
  "Tasks List"
  fontSize: 20
  fontWeight: '700'
  color: '#FFFFFF'
  marginBottom: 16
  marginTop: 12
```

### SearchBar

```
container:
  backgroundColor: '#162040'
  borderRadius: 12
  height: 48
  paddingHorizontal: 16
  flexDirection: 'row'
  alignItems: 'center'
  marginBottom: 20

search icon:
  Ionicons 'search-outline', size: 20, color: '#4A6A8A'
  marginLeft: 4  (right side, flex end)

TextInput:
  flex: 1
  color: '#FFFFFF'
  fontSize: 14
  placeholder: 'Search by task title'
  placeholderTextColor: '#4A6A8A'
```

### FlatList

```
paddingBottom: 80    (clears FAB)
showsVerticalScrollIndicator: false
```

### TaskCard

```
backgroundColor: '#FFFFFF'
borderRadius: 12
paddingVertical: 16
paddingHorizontal: 16
marginBottom: 10
flexDirection: 'row'
alignItems: 'center'

shadowColor: '#000000'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.15
shadowRadius: 6
elevation: 3

— Title:
  fontSize: 15
  fontWeight: '600'
  color: '#0A1628'
  flex: 1

— Meta (below title):
  fontSize: 12
  color: '#7A8DA0'
  marginTop: 4
  format: '{relative_day} | {HH:MMam/pm}'
    e.g. "Tomorrow | 10:30pm"

— Chevron:
  Ionicons 'chevron-forward', size: 20, color: '#2563EB'
  marginLeft: 8
```

### Floating Action Button

```
position: 'absolute'
bottom: 24
right: 16
width: 56
height: 56
borderRadius: 9999
backgroundColor: '#2563EB'
alignItems: 'center'
justifyContent: 'center'

shadowColor: '#2563EB'
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.4
shadowRadius: 8
elevation: 8

icon: Ionicons 'add', size: 28, color: '#FFFFFF'
activeOpacity: 0.8
```

### Empty State

```
flex: 1
alignItems: 'center'
justifyContent: 'center'

Text: 'No tasks yet.'
  fontSize: 16
  color: '#8FA8C8'
```

---

## Screen: CreateTaskScreen (Bottom Sheet)

### Presentation

```
Modal bottom sheet slides up over TaskListScreen.
Background behind sheet: dim overlay rgba(0,0,0,0.5)

sheet container:
  backgroundColor: '#FFFFFF'
  borderTopLeftRadius: 16
  borderTopRightRadius: 16
  paddingHorizontal: 20
  paddingVertical: 20
  paddingBottom: safeAreaBottom + 20

shadowColor: '#000000'
shadowOffset: { width: 0, height: -4 }
shadowOpacity: 0.25
shadowRadius: 12
elevation: 16
```

### TaskInput (title field)

```
backgroundColor: '#162040'
borderRadius: 12
height: 52
paddingHorizontal: 16
flexDirection: 'row'
alignItems: 'center'
marginBottom: 12

icon: Ionicons 'checkbox-outline', size: 20, color: '#4A6A8A'
      marginRight: 10

TextInput:
  flex: 1
  color: '#FFFFFF'
  fontSize: 14
  placeholder: 'task'
  placeholderTextColor: '#4A6A8A'

— error state: borderWidth: 1, borderColor: '#F44336'
```

### DescriptionInput

```
backgroundColor: '#162040'
borderRadius: 12
height: 140
paddingHorizontal: 16
paddingTop: 14
flexDirection: 'row'
alignItems: 'flex-start'
marginBottom: 12

icon: Ionicons 'reorder-three-outline', size: 20, color: '#4A6A8A'
      marginRight: 10, marginTop: 2

TextInput:
  flex: 1
  color: '#FFFFFF'
  fontSize: 14
  placeholder: 'Description'
  placeholderTextColor: '#4A6A8A'
  multiline: true
  textAlignVertical: 'top'
```

### Date + Time Row

```
flexDirection: 'row'
gap: 12
marginBottom: 16

— Each field (DatePickerField / TimePickerField):
  flex: 1
  backgroundColor: '#162040'
  borderRadius: 12
  height: 48
  paddingHorizontal: 14
  flexDirection: 'row'
  alignItems: 'center'

  icon: size 18, color '#4A6A8A', marginRight: 8

  label Text:
    fontSize: 14
    color: '#4A6A8A'   (empty)
    color: '#FFFFFF'   (filled)
```

### Action Row

```
flexDirection: 'row'
gap: 12

— SecondaryButton (cancel):
  flex: 1
  height: 52
  borderRadius: 8
  borderWidth: 1.5
  borderColor: '#00BCD4'
  backgroundColor: 'transparent'
  alignItems: 'center'
  justifyContent: 'center'

  label: 'cancel'
    fontSize: 15, fontWeight: '500', color: '#00BCD4'

— PrimaryButton (create):
  flex: 1
  height: 52
  borderRadius: 8
  backgroundColor: '#26A69A'
  alignItems: 'center'
  justifyContent: 'center'

  label: 'create'
    fontSize: 15, fontWeight: '600', color: '#FFFFFF'

  — loading state:
    backgroundColor: '#26A69A' at opacity 0.7
    ActivityIndicator color='#FFFFFF' size='small'
    disabled: true
```

---

## Screen: TaskDetailScreen

### Navigation Header

```
headerShown: true
headerTransparent: true
headerTintColor: '#FFFFFF'
headerTitle: 'Task Details'
headerTitleStyle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' }
headerBackButtonDisplayMode: 'minimal'
```

### Content Container

```
flex: 1
paddingHorizontal: 20
paddingTop: 16    (additional spacing below header)
```

### EditableTitleHeader

```
flexDirection: 'row'
alignItems: 'center'
marginBottom: 12
gap: 10

title Text:
  fontSize: 24
  fontWeight: '700'
  color: '#FFFFFF'
  flex: 1

edit icon:
  Ionicons 'pencil-outline', size: 18, color: '#8FA8C8'
```

### MetaRow

```
flexDirection: 'row'
alignItems: 'center'
gap: 16
marginBottom: 20

— each item:
  flexDirection: 'row', alignItems: 'center', gap: 6

  icon: size 14, color '#8FA8C8'
  text: fontSize 13, color '#8FA8C8'

  date: Ionicons 'calendar-outline'  → "Today"
  time: Ionicons 'time-outline'      → "20:00pm"
```

### Description Body

```
fontSize: 14
color: '#FFFFFF'
lineHeight: 22
opacity: 0.9
marginBottom: 32
```

### ActionButton Row

```
flexDirection: 'row'
justifyContent: 'space-around'
marginTop: 'auto'          (pushes to bottom of flex container)
paddingBottom: 24          (above BottomNavBar)

— Each ActionButton:
  backgroundColor: '#162040'
  borderRadius: 12
  width: 80
  paddingVertical: 14
  paddingHorizontal: 12
  alignItems: 'center'

  shadowColor: '#000000'
  shadowOffset: { width: 0, height: 2 }
  shadowOpacity: 0.2
  shadowRadius: 4
  elevation: 2

  icon: size 28 (see variants below)
  label: fontSize 12, fontWeight '500', color '#FFFFFF', marginTop 8

  activeOpacity: 0.75

Variant → Done:
  icon: Ionicons 'checkmark-circle', color '#4CAF50'
  label: 'Done'

Variant → Delete:
  icon: Ionicons 'trash', color '#F44336'
  label: 'Delete'

Variant → Pin:
  icon: MaterialIcons 'push-pin' OR Ionicons 'pin', color '#FFC107'
  label: 'Pin'
```

---

## BottomNavBar

```
position: fixed / absolute bottom
height: 60 + safeAreaBottom
backgroundColor: '#0A1628'
flexDirection: 'row'
justifyContent: 'space-around'
alignItems: 'center'

— Each tab:
  flex: 1
  alignItems: 'center'
  justifyContent: 'center'

  icon size: 24
  active color:   '#FFFFFF'
  inactive color: '#4A6A8A'
```

---

## Interaction Behaviors

### TaskCard → TaskDetail Navigation

1. User taps any `TaskCard`
2. Navigate to `TaskDetailScreen` with `{ taskId }` param
3. Detail screen fetches task data by ID (`GET /api/todos/:id` — if endpoint exists) or receives full `todo` object via params

### FAB → CreateTask Sheet

1. User taps FAB
2. Bottom sheet slides up from bottom (`Animated` or `@gorhom/bottom-sheet`)
3. Keyboard-aware: sheet adjusts when keyboard opens
4. Dismiss: tap backdrop, swipe down, or press cancel

### Create Task Flow

1. Fill title (required) + optional description, date, time
2. Press "create"
3. `POST /api/todos` with `{ title, description }`
4. On success: dismiss sheet, list reloads
5. On error: `SaveErrorBanner` inside sheet

### Delete from Detail

1. User presses "Delete" ActionButton
2. `Alert.alert` confirmation (native) / inline confirm UI (web fallback)
3. On confirm: `DELETE /api/todos/:id`
4. On success: `navigation.goBack()` to TaskList, list reloads

### Done Toggle from Detail

1. User presses "Done" ActionButton
2. `PATCH /api/todos/:id/toggle` (or `PUT` with `isCompleted: true`)
3. UI updates optimistically or reloads

---

## Spacing Reference Card

```
4px  — xs  — micro gaps, icon padding
8px  — sm  — icon-to-text gap, small internal padding
12px — md  — card internal padding (vertical), field gap
16px — lg  — screen horizontal padding, card content padding
20px — xl  — form container padding, section spacing
24px — 2xl — FAB margin, bottom nav padding
32px — 3xl — large section separation
```

## Color Quick Reference

```
#1B3A7A — Gradient top (screen background start)
#0A1628 — Gradient bottom (screen background end / nav bar)
#162040 — Input fields, action buttons, bottom sheet inputs
#FFFFFF — Cards, on-dark primary text, button text
#2563EB — FAB, chevron icons
#26A69A — Create button (teal-green)
#00BCD4 — Cancel button border + text (teal)
#4CAF50 — Done icon
#F44336 — Delete icon
#FFC107 — Pin icon
#0A1628 — Card title text (dark navy on white)
#7A8DA0 — Card meta text
#8FA8C8 — On-dark secondary text (meta, inactive icons)
#4A6A8A — Placeholder text, inactive nav icons
```

---

## Platform Notes

| Behavior | iOS | Android | Web |
|----------|-----|---------|-----|
| `LinearGradient` | `expo-linear-gradient` | same | same |
| `Alert.alert` delete confirm | Native UIAlertController | Native AlertDialog | No-op — use inline confirm UI |
| `textAlignVertical: 'top'` | No effect | Required for multiline | N/A |
| `headerTransparent: true` | Works | Works | N/A |
| `headerBackButtonDisplayMode: 'minimal'` | iOS only | N/A (system back) | N/A |
| Bottom sheet | `@gorhom/bottom-sheet` recommended | same | Limited support |
| `elevation` (shadow) | Ignored | Required | N/A |
| Safe area insets | Required (notch) | Required | N/A |

---

## Backend API Mapping

| Action | Endpoint | Notes |
|--------|----------|-------|
| List tasks | `GET /api/todos` | TaskListScreen load |
| Create task | `POST /api/todos` | `{ title, description }` |
| Get detail | params or `GET /api/todos/:id` | pass full `todo` via nav params if no GET by ID |
| Toggle done | `PATCH /api/todos/:id/toggle` | Done button on detail |
| Delete | `DELETE /api/todos/:id` | Delete button on detail |
| Update | `PUT /api/todos/:id` | Edit flow (future) |
