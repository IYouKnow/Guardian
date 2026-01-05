
import { Theme } from "../types";
import { getThemeClasses as getSharedThemeClasses } from "../../../shared/themes";

export function getThemeClasses(theme: Theme) {
    const shared = getSharedThemeClasses(theme);

    return {
        ...shared,
        // Map missing keys required by extension to shared values or custom overrides ensuring consistency
        headerBg: shared.cardBg || shared.bg, // Fallback to cardBg or bg
        sectionBg: shared.sectionBg,
        hoverBg: shared.hoverBg, // Ensure we use shared hover
        inputBg: shared.inputBg,
        activeText: shared.activeText,

        // Explicitly ensure borders match
        border: shared.border,

        // If extension components specifically used 'text-gray-800' vs shared 'text-slate-900', 
        // we now prefer shared. But sidebar might need tweaks if it looks broken.
        // For now, total alignment is the goal.
    };
}
