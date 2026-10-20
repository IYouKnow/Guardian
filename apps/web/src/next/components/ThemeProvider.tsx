import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { AccentColor, Theme } from "@guardian/core/themes";
import { useTheme as useSharedTheme } from "@/context/ThemeContext";
import { applyConsoleAppearance, consoleThemeClass, type ConsoleTheme } from "@next/lib/appearance";

interface ConsoleThemeContextValue {
  /** The palette the console is currently rendering. */
  theme: ConsoleTheme;
  /** The shared preference value ("system" | "light" | "dark" | "slate" | "editor" | "violet"). */
  mode: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ConsoleThemeContextValue | null>(null);

/**
 * Bridges the app's server-synced appearance preferences (ThemeContext ->
 * /api/preferences) onto the console's CSS variables. The console is a consumer
 * of the shared preferences, not a parallel theme system.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme, accentColor, setAccentColor } = useSharedTheme();

  const consoleTheme = consoleThemeClass(theme);

  useEffect(() => {
    applyConsoleAppearance(theme, accentColor);
  }, [theme, accentColor]);

  const toggleTheme = () => setTheme(consoleTheme === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider
      value={{ theme: consoleTheme, mode: theme, toggleTheme, setTheme, accentColor, setAccentColor }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within the console ThemeProvider');
  }
  return context;
};
