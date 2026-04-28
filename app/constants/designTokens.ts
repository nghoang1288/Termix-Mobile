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
  PRIMARY: "#eceae4",
  SECONDARY: "#e4e0d6",
  SEPARATOR: "#eceae4",
  BUTTON: "rgba(28,28,28,0.16)",
  ACTIVE: "#1c1c1c",
  PANEL: "#eceae4",
} as const;

export const BACKGROUNDS = {
  DARKEST: "#101010",
  DARKER: "#161616",
  HEADER: "#f1eee6",
  DARK: "#f7f4ed",
  CARD: "#fcfbf8",
  BUTTON: "#f7f4ed",
  BUTTON_ALT: "rgba(28,28,28,0.04)",
  ACTIVE: "#1c1c1c",
  HOVER: "rgba(28,28,28,0.07)",
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
  PRIMARY: "#1c1c1c",
  SECONDARY: "rgba(28,28,28,0.74)",
  TERTIARY: "#5f5f5d",
  DISABLED: "rgba(28,28,28,0.35)",
  ACCENT: "#1c1c1c",
} as const;

export const ICON_SIZES = {
  SMALL: 16,
  MEDIUM: 18,
  LARGE: 20,
} as const;
