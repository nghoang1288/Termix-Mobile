/**
 * Includes a default value for all margins, borders, design elements, etc.
 * These can be used across all components as a default inside the style tag in a component
 * Any styling not included as a default here, can be set inside a className using NativeWind
 */

export const BORDERS = {
  MAJOR: 2,
  STANDARD: 1,
  SEPARATOR: 1,
} as const;

export const BORDER_COLORS = {
  PRIMARY: "#343b46",
  SECONDARY: "#2b323c",
  SEPARATOR: "#2b323c",
  BUTTON: "#343b46",
  ACTIVE: "#38bdf8",
  PANEL: "#2b323c",
} as const;

export const BACKGROUNDS = {
  DARKEST: "#07090d",
  DARKER: "#171b21",
  HEADER: "#1a1f27",
  DARK: "#1b1f25",
  CARD: "#20252d",
  BUTTON: "#242a33",
  BUTTON_ALT: "#20252d",
  ACTIVE: "#334155",
  HOVER: "#2d3440",
} as const;

export const RADIUS = {
  BUTTON: 6,
  CARD: 8,
  SMALL: 4,
  LARGE: 12,
} as const;

export const SPACING = {
  TOOLBAR_PADDING_PORTRAIT: 12,
  TOOLBAR_PADDING_LANDSCAPE: 8,
  BUTTON_PADDING_PORTRAIT: 8,
  BUTTON_PADDING_LANDSCAPE: 6,
  CARD_GAP: 12,
  BUTTON_GAP: 8,
} as const;

export const TEXT_COLORS = {
  PRIMARY: "#edf2f7",
  SECONDARY: "#c5ced8",
  TERTIARY: "#7f8a98",
  DISABLED: "#4B5563",
  ACCENT: "#38bdf8",
} as const;

export const ICON_SIZES = {
  SMALL: 16,
  MEDIUM: 18,
  LARGE: 20,
} as const;
