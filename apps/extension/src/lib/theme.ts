import type { AccentColor, Theme } from "@/types";

export type ResolvedTheme = Exclude<Theme, "system">;

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

/**
 * Writes the resolved theme + accent onto <html> as data attributes.
 * All color tokens in index.css key off `data-theme` / `data-accent`.
 */
export function applyTheme(theme: Theme, accent: AccentColor): ResolvedTheme {
  const resolved = resolveTheme(theme);
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.accent = accent;
    root.style.colorScheme = resolved === "light" ? "light" : "dark";
  }
  return resolved;
}

/**
 * Re-applies the theme when the OS preference flips, but only while the
 * user has selected "system". Returns an unsubscribe function.
 */
export function watchSystemTheme(theme: Theme, onChange: () => void): () => void {
  if (theme !== "system" || typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mql = window.matchMedia("(prefers-color-scheme: light)");
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "slate", label: "Slate" },
  { value: "editor", label: "Editor" },
  { value: "violet", label: "Violet" },
];

export const ACCENTS: { value: AccentColor; label: string; hex: string }[] = [
  { value: "yellow", label: "Yellow", hex: "#f5c518" },
  { value: "orange", label: "Orange", hex: "#fb923c" },
  { value: "red", label: "Red", hex: "#ef4444" },
  { value: "pink", label: "Pink", hex: "#f472b6" },
  { value: "purple", label: "Purple", hex: "#c084fc" },
  { value: "blue", label: "Blue", hex: "#3b82f6" },
  { value: "cyan", label: "Cyan", hex: "#22d3ee" },
  { value: "green", label: "Green", hex: "#4ade80" },
  { value: "black", label: "Black", hex: "#18181b" },
];
