import type { ShadowStyleIOS, ViewStyle } from 'react-native';

// ─── Colors ──────────────────────────────────────────────────────────────────

export const colors = {
  // Gradient background (expo-linear-gradient)
  gradientTop: '#1B3A7A',
  gradientBottom: '#0A1628',

  // Surfaces
  surfaceCard: '#FFFFFF',
  surfaceInput: '#162040',
  surfaceSheet: '#FFFFFF',
  surfaceActionBtn: '#162040',
  surfaceBottomNav: '#0A1628',

  // Primary accent
  primary: '#2563EB',
  primaryLight: '#3B82F6',

  // Form action buttons
  actionTeal: '#00BCD4',
  actionCreate: '#26A69A',

  // Semantic status
  done: '#4CAF50',
  delete: '#F44336',
  pin: '#FFC107',

  // Text — on dark (gradient) background
  textOnDark: '#FFFFFF',
  textOnDarkSecondary: '#8FA8C8',

  // Text — on white card
  textOnCard: '#0A1628',
  textOnCardMeta: '#7A8DA0',

  // Text — inputs & labels
  textPlaceholder: '#4A6A8A',
  textCancel: '#00BCD4',

  // Auth ekranı token'ları
  authButtonBg: '#0EA5E9',
  authButtonPressed: '#0284C7',
  surfaceAuthInput: '#FFFFFF',
  textAuthInput: '#1A1A1A',
  textAuthPlaceholder: 'rgba(0,0,0,0.44)',
  textAuthLink: '#63D9F3',
  textAuthLinkMuted: 'rgba(255,255,255,0.80)',
  authInputIcon: 'rgba(0,0,0,0.44)',
  errorBg: 'rgba(244,67,54,0.15)',
} as const;

export type Colors = typeof colors;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export type Spacing = typeof spacing;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radius = {
  sm: 8,       // buttons
  md: 12,      // cards, inputs, search bar, date/time pickers
  lg: 16,      // bottom sheet top corners
  actionBtn: 12, // detail screen action buttons
  full: 9999,  // FAB (full circle)
} as const;

export type Radius = typeof radius;

// ─── Font Sizes ───────────────────────────────────────────────────────────────

export const fontSize = {
  screenTitle: 20,      // "Tasks List" heading
  taskTitleCard: 15,    // title on white card
  taskTitleDetail: 24,  // title on detail screen
  metaCard: 12,         // "Tomorrow | 10:30pm" on card
  metaDetail: 13,       // "Today | 20:00pm" on detail screen
  body: 14,             // description body text
  label: 14,            // form field label
  buttonPrimary: 15,    // create / update button
  buttonSecondary: 15,  // cancel button
  actionLabel: 12,      // Done / Delete / Pin labels
  navHeader: 16,        // navigation header title
  navIcon: 10,          // bottom nav tab labels
  captionError: 13,     // field validation error text
} as const;

export type FontSize = typeof fontSize;

// ─── Font Weights ─────────────────────────────────────────────────────────────

export const fontWeight = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
} as const satisfies Record<string, ViewStyle['borderBottomWidth'] extends number ? string : string>;

// ─── Shadows ──────────────────────────────────────────────────────────────────

type ShadowStyle = ShadowStyleIOS & { elevation: number };

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  fab: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  actionBtn: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
  },
} as const satisfies Record<string, ShadowStyle>;

export type Shadows = typeof shadows;

// ─── Component Sizes ──────────────────────────────────────────────────────────

export const sizes = {
  fab: 56,
  searchBar: 48,
  taskCardMinHeight: 72,
  inputSingleLine: 52,
  descriptionInput: 140,
  dateTimeField: 48,
  actionButton: { width: 80, height: 88 },
  bottomNavBar: 60,
  button: 52,
} as const;

export type Sizes = typeof sizes;

// ─── Gradient ─────────────────────────────────────────────────────────────────

export const gradient = {
  screen: {
    colors: [colors.gradientTop, colors.gradientBottom] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
} as const;

export type Gradient = typeof gradient;
