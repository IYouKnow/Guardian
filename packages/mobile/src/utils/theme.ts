import type { Theme as SharedTheme } from "@guardian/shared/themes";
import { getThemeClasses as getSharedThemeClasses } from "@guardian/shared/themes";

export type MobileTheme = "dark" | "half-dark" | "light";

export function toSharedTheme(theme: MobileTheme): SharedTheme {
  if (theme === "half-dark") return "slate";
  return theme;
}

export function getThemeClasses(theme: MobileTheme) {
  const shared = getSharedThemeClasses(toSharedTheme(theme));

  return {
    ...shared,
    headerBg: shared.sectionBg,
    navBg: shared.card,
  };
}

