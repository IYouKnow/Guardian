
import { AccentColor } from "../types";
import { getAccentColorClasses as getSharedAccentClasses } from "../../../shared/themes";

export function getAccentColorClasses(color: AccentColor) {
  return getSharedAccentClasses(color);
}
