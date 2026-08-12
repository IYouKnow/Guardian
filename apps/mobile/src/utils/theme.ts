import type { Theme } from "@guardian/core/themes";
import { getThemeClasses as getSharedThemeClasses, resolveTheme } from "@guardian/core/themes";

export type MobileTheme = Theme;

export function getThemeClasses(theme: Theme) {
  const resolved = resolveTheme(theme);
  const shared = getSharedThemeClasses(resolved);

  return {
    ...shared,
    // Mobile-specific aliases used by existing components/layout.
    headerBg: shared.sectionBg,
    navBg: shared.card,
  };
}

