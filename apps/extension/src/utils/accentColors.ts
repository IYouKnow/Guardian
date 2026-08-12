import type { AccentColor, Theme } from "../types";
import { getAccentColorClasses as getSharedAccentClasses } from "@guardian/core/themes";

export function getAccentColorClasses(color: AccentColor, theme: Theme = "dark") {
  return getSharedAccentClasses(color, theme);
}
