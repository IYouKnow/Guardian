import { getAccentColorHex, resolveTheme, type AccentColor, type Theme } from '@guardian/core/themes';

/**
 * Themes the console can render. `system` resolves to light/dark via
 * prefers-color-scheme; light/dark/slate/editor/violet each have a
 * CSS-variable palette in apps/web/src/index.css.
 */
export type ConsoleTheme = Exclude<Theme, 'system'>;

const CONSOLE_THEME_CLASSES: readonly ConsoleTheme[] = ['light', 'dark', 'slate', 'editor', 'violet'];

// The full shared theme vocabulary — the console now renders all of them.
export const THEME_OPTIONS: readonly Theme[] = ['system', 'light', 'dark', 'slate', 'editor', 'violet'];

// The console adopts the full shared accent set so the choice round-trips with
// the main app through /api/preferences.
export const ACCENT_OPTIONS: readonly AccentColor[] = [
  'black', 'yellow', 'blue', 'green', 'purple', 'pink', 'orange', 'cyan', 'red',
];

/** The palette class the console renders for a shared theme. */
export function consoleThemeClass(theme: Theme): ConsoleTheme {
  return resolveTheme(theme);
}

/** "#f5c518" -> "47 92% 53%" (the `H S% L%` form the console's CSS vars expect). */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** The accent's primary colour as the console's `H S% L%` CSS-var value. */
export function accentPrimaryHsl(color: AccentColor, theme: Theme): string {
  const { h, s, l } = hexToHsl(getAccentColorHex(color, theme));
  return `${h} ${s}% ${l}%`;
}

/** The accent's swatch colour (used by the settings picker). */
export function accentSwatch(color: AccentColor, theme: Theme): string {
  return getAccentColorHex(color, theme);
}

/**
 * Applies the shared appearance preferences to the console's CSS variables:
 * the theme palette class plus the accent's primary/ring/sidebar colours.
 */
export function applyConsoleAppearance(theme: Theme, accent: AccentColor): void {
  const root = document.documentElement;
  const palette = consoleThemeClass(theme);

  root.classList.remove(...CONSOLE_THEME_CLASSES);
  root.classList.add(palette);

  const primary = accentPrimaryHsl(accent, palette);
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--sidebar-primary', primary);
}

/**
 * Removes the console palette so it never leaks into the rest of the app — the
 * main app's shadcn primitives read these same CSS variables.
 */
export function clearConsoleAppearance(): void {
  const root = document.documentElement;
  root.classList.remove(...CONSOLE_THEME_CLASSES);
  root.style.removeProperty('--primary');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--sidebar-primary');
}
