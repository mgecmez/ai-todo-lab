# Design System — Todo App

> Derived from visual design references in `docs/design-references/`.
> All values are React Native StyleSheet compatible.

---

## 1. Color Palette

### Background — Gradient

The app uses a single vertical linear gradient applied to all screens.

```js
// React Native LinearGradient (expo-linear-gradient)
colors: ['#1B3A7A', '#0A1628']
start:  { x: 0, y: 0 }   // top
end:    { x: 0, y: 1 }   // bottom
```

| Token | Value | Usage |
|-------|-------|-------|
| `color.gradient.top` | `#1B3A7A` | Gradient start (top of screen) |
| `color.gradient.bottom` | `#0A1628` | Gradient end (bottom of screen) |

### Surface Colors

| Token | Value | Usage |
|-------|-------|-------|
| `color.surface.card` | `#FFFFFF` | TaskCard background (on gradient) |
| `color.surface.input` | `#162040` | Form inputs, date/time pickers (dark navy) |
| `color.surface.sheet` | `#FFFFFF` | Bottom sheet background (CreateTask modal) |
| `color.surface.actionBtn` | `#162040` | Detail screen action buttons (Done, Delete, Pin) |
| `color.surface.bottomNav` | `#0A1628` | Bottom navigation bar background |

### Primary Accent

| Token | Value | Usage |
|-------|-------|-------|
| `color.primary` | `#2563EB` | FAB background, card chevron icon |
| `color.primary.light` | `#3B82F6` | Future: hover / focus state |

### Secondary / Action

| Token | Value | Usage |
|-------|-------|-------|
| `color.action.teal` | `#00BCD4` | Cancel button border + text |
| `color.action.create` | `#26A69A` | Create button background (teal-green) |

### Semantic Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `color.done` | `#4CAF50` | Done action icon (green checkmark) |
| `color.delete` | `#F44336` | Delete action icon (red trash) |
| `color.pin` | `#FFC107` | Pin action icon (amber) |

### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `color.text.onDark` | `#FFFFFF` | All text on gradient background |
| `color.text.onDarkSecondary` | `#8FA8C8` | Meta text, subtitles on dark background |
| `color.text.onCard` | `#0A1628` | Task title on white card |
| `color.text.onCardMeta` | `#7A8DA0` | Date/time meta text on white card |
| `color.text.placeholder` | `#4A6A8A` | Input placeholder text on dark inputs |
| `color.text.cancel` | `#00BCD4` | Cancel button label |

---

## 2. Typography

Base font: System default (`-apple-system` / `SF Pro` on iOS, `Roboto` on Android)

### Scale

| Token | Size | Weight | Color | Usage |
|-------|------|--------|-------|-------|
| `type.screenTitle` | 20sp | 700 | `#FFFFFF` | "Tasks List" screen heading |
| `type.taskTitle.card` | 15sp | 600 | `#0A1628` | Task title on white card |
| `type.taskTitle.detail` | 24sp | 700 | `#FFFFFF` | Task title on detail screen |
| `type.meta.card` | 12sp | 400 | `#7A8DA0` | "Tomorrow \| 10:30pm" on card |
| `type.meta.detail` | 13sp | 400 | `#8FA8C8` | "Today \| 20:00pm" on detail screen |
| `type.body` | 14sp | 400 | `#FFFFFF` | Description body text (detail screen) |
| `type.label` | 14sp | 400 | `#4A6A8A` | Input placeholder / field label |
| `type.button.primary` | 15sp | 600 | `#FFFFFF` | Create button, action button labels |
| `type.button.secondary` | 15sp | 500 | `#00BCD4` | Cancel button |
| `type.actionLabel` | 12sp | 500 | `#FFFFFF` | Done / Delete / Pin labels below icons |
| `type.navIcon` | 10sp | 400 | `#8FA8C8` | Bottom nav labels (if shown) |
| `type.header.nav` | 16sp | 600 | `#FFFFFF` | Navigation header ("Task Details") |

---

## 3. Spacing Scale

Base unit: **4px**

| Token | Value | Usage |
|-------|-------|-------|
| `space.xs` | 4px | Icon padding, micro gaps |
| `space.sm` | 8px | Icon-to-text gap, small internal padding |
| `space.md` | 12px | Card internal vertical padding, meta gap |
| `space.lg` | 16px | Screen horizontal padding, card content padding |
| `space.xl` | 20px | Between sections, form field gaps |
| `space.2xl` | 24px | FAB margin, bottom nav padding |
| `space.3xl` | 32px | Large section spacing |

---

## 4. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius.sm` | 8px | Cancel / Create buttons |
| `radius.md` | 12px | TaskCard, SearchBar, form inputs, date/time pickers |
| `radius.lg` | 16px | Bottom sheet top corners |
| `radius.actionBtn` | 12px | Detail action buttons (Done/Delete/Pin) |
| `radius.full` | 9999px | FAB (full circle) |

---

## 5. Shadows

### TaskCard Shadow (white card on dark background)

```js
shadowColor: '#000000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.15,
shadowRadius: 6,
elevation: 3,
```

### Bottom Sheet Shadow

```js
shadowColor: '#000000',
shadowOffset: { width: 0, height: -4 },
shadowOpacity: 0.25,
shadowRadius: 12,
elevation: 16,
```

### FAB Shadow

```js
shadowColor: '#2563EB',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.4,
shadowRadius: 8,
elevation: 8,
```

### Detail Action Button Shadow (subtle)

```js
shadowColor: '#000000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.2,
shadowRadius: 4,
elevation: 2,
```

---

## 6. Component Sizing

| Component | Width | Height | Notes |
|-----------|-------|--------|-------|
| FAB | 56px | 56px | borderRadius full |
| SearchBar | 100% | 48px | borderRadius 12 |
| TaskCard | 100% | ~72px | min-height, grows with content |
| TaskInput (single) | 100% | 52px | borderRadius 12 |
| DescriptionInput | 100% | 140px | multiline, borderRadius 12 |
| DatePicker field | ~45% | 48px | borderRadius 12 |
| TimePicker field | ~45% | 48px | borderRadius 12 |
| PrimaryButton (Create) | ~48% | 52px | borderRadius 8 |
| SecondaryButton (Cancel) | ~48% | 52px | borderRadius 8 |
| ActionButton (Done/Delete/Pin) | ~80px | ~88px | icon 48px + label below |
| BottomNavBar | 100% | 60px | fixed bottom |

---

## 7. Layout

### Screen Structure

```
┌──────────────────────────────────┐
│  LinearGradient (full screen)    │
│  ┌────────────────────────────┐  │
│  │ StatusBar (dark content)   │  │
│  ├────────────────────────────┤  │
│  │ Content area               │  │
│  │                            │  │
│  ├────────────────────────────┤  │
│  │ BottomNavBar (fixed)       │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### Bottom Navigation — 4 Tabs

| Index | Icon | Active color |
|-------|------|--------------|
| 0 | Home (house) | `#FFFFFF` |
| 1 | Tasks (list) | `#FFFFFF` |
| 2 | Calendar | `#FFFFFF` |
| 3 | Settings (gear) | `#FFFFFF` |

Active tab icon color: `#FFFFFF`
Inactive tab icon color: `#4A6A8A`
Background: `#0A1628`
Height: `60px`

---

## 8. Design Tokens — React Native Object

```js
// mobile/src/theme/tokens.ts

export const colors = {
  // Gradient
  gradientTop: '#1B3A7A',
  gradientBottom: '#0A1628',

  // Surfaces
  surfaceCard: '#FFFFFF',
  surfaceInput: '#162040',
  surfaceSheet: '#FFFFFF',
  surfaceActionBtn: '#162040',
  surfaceBottomNav: '#0A1628',

  // Primary
  primary: '#2563EB',
  primaryLight: '#3B82F6',

  // Actions
  actionTeal: '#00BCD4',
  actionCreate: '#26A69A',

  // Status
  done: '#4CAF50',
  delete: '#F44336',
  pin: '#FFC107',

  // Text
  textOnDark: '#FFFFFF',
  textOnDarkSecondary: '#8FA8C8',
  textOnCard: '#0A1628',
  textOnCardMeta: '#7A8DA0',
  textPlaceholder: '#4A6A8A',
  textCancel: '#00BCD4',
};

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
};

export const radius = {
  sm:        8,
  md:        12,
  lg:        16,
  actionBtn: 12,
  full:      9999,
};

export const fontSize = {
  screenTitle:    20,
  taskTitleCard:  15,
  taskTitleDetail: 24,
  metaCard:       12,
  metaDetail:     13,
  body:           14,
  label:          14,
  buttonPrimary:  15,
  buttonSecondary: 15,
  actionLabel:    12,
  navHeader:      16,
};
```

---

## 9. Design Principles

1. **Dark-first** — gradient background on all screens; no plain white screens.
2. **Surface contrast** — white cards and dark inputs create clear information hierarchy on the dark background.
3. **Single gradient, no per-screen colors** — the same `LinearGradient` wraps all screens.
4. **Accent by function** — blue for navigation/FAB, teal for form actions, semantic colors (green/red/yellow) only in explicit status contexts.
5. **Bottom sheet for creation** — CreateTask uses a bottom sheet modal over TaskList, maintaining context.
6. **Touch targets ≥ 44×44pt** — all tappable elements meet iOS HIG minimum.
