export type Theme = "dark" | "slate" | "light" | "editor" | "violet";

export type AccentColor = "yellow" | "blue" | "green" | "purple" | "pink" | "orange" | "cyan" | "red";

export const getAccentColorClasses = (color: AccentColor) => {
    const colorMap: Record<AccentColor, {
        base: string;
        hover: string;
        light: string;
        border: string;
        baseClass: string;
        hoverClass: string;
        lightClass: string;
        borderClass: string;
        textClass: string;
        bgClass: string;
        bgHoverClass: string;
        shadowClass: string;
        hoverShadowClass: string;
        focusRingClass: string;
        focusBorderClass: string;
        hoverTextClass: string;
        hoverBgClass: string;
        hoverBorderClass: string;
        hoverBgLightClass: string;
    }> = {
        yellow: {
            base: "yellow-400", hover: "yellow-500", light: "yellow-400/20", border: "yellow-400/30",
            baseClass: "border-yellow-400 bg-yellow-400", hoverClass: "hover:bg-yellow-500",
            lightClass: "bg-yellow-400/20", borderClass: "border-yellow-400/30",
            textClass: "text-yellow-400", bgClass: "bg-yellow-400", bgHoverClass: "hover:bg-yellow-500",
            shadowClass: "shadow-yellow-400/20", hoverShadowClass: "hover:shadow-yellow-400/10", focusRingClass: "focus:ring-yellow-400/50", focusBorderClass: "focus:border-yellow-400/50",
            hoverTextClass: "hover:text-yellow-400", hoverBgClass: "hover:bg-yellow-400/10", hoverBorderClass: "hover:border-yellow-400/50",
            hoverBgLightClass: "group-hover:bg-yellow-400/40",
        },
        blue: {
            base: "blue-400", hover: "blue-500", light: "blue-400/20", border: "blue-400/30",
            baseClass: "border-blue-400 bg-blue-400", hoverClass: "hover:bg-blue-500",
            lightClass: "bg-blue-400/20", borderClass: "border-blue-400/30",
            textClass: "text-blue-400", bgClass: "bg-blue-400", bgHoverClass: "hover:bg-blue-500",
            shadowClass: "shadow-blue-400/20", hoverShadowClass: "hover:shadow-blue-400/10", focusRingClass: "focus:ring-blue-400/50", focusBorderClass: "focus:border-blue-400/50",
            hoverTextClass: "hover:text-blue-400", hoverBgClass: "hover:bg-blue-400/10", hoverBorderClass: "hover:border-blue-400/50",
            hoverBgLightClass: "group-hover:bg-blue-400/40",
        },
        green: {
            base: "green-400", hover: "green-500", light: "green-400/20", border: "green-400/30",
            baseClass: "border-green-400 bg-green-400", hoverClass: "hover:bg-green-500",
            lightClass: "bg-green-400/20", borderClass: "border-green-400/30",
            textClass: "text-green-400", bgClass: "bg-green-400", bgHoverClass: "hover:bg-green-500",
            shadowClass: "shadow-green-400/20", hoverShadowClass: "hover:shadow-green-400/10", focusRingClass: "focus:ring-green-400/50", focusBorderClass: "focus:border-green-400/50",
            hoverTextClass: "hover:text-green-400", hoverBgClass: "hover:bg-green-400/10", hoverBorderClass: "hover:border-green-400/50",
            hoverBgLightClass: "group-hover:bg-green-400/40",
        },
        purple: {
            base: "purple-400", hover: "purple-500", light: "purple-400/20", border: "purple-400/30",
            baseClass: "border-purple-400 bg-purple-400", hoverClass: "hover:bg-purple-500",
            lightClass: "bg-purple-400/20", borderClass: "border-purple-400/30",
            textClass: "text-purple-400", bgClass: "bg-purple-400", bgHoverClass: "hover:bg-purple-500",
            shadowClass: "shadow-purple-400/20", hoverShadowClass: "hover:shadow-purple-400/10", focusRingClass: "focus:ring-purple-400/50", focusBorderClass: "focus:border-purple-400/50",
            hoverTextClass: "hover:text-purple-400", hoverBgClass: "hover:bg-purple-400/10", hoverBorderClass: "hover:border-purple-400/50",
            hoverBgLightClass: "group-hover:bg-purple-400/40",
        },
        pink: {
            base: "pink-400", hover: "pink-500", light: "pink-400/20", border: "pink-400/30",
            baseClass: "border-pink-400 bg-pink-400", hoverClass: "hover:bg-pink-500",
            lightClass: "bg-pink-400/20", borderClass: "border-pink-400/30",
            textClass: "text-pink-400", bgClass: "bg-pink-400", bgHoverClass: "hover:bg-pink-500",
            shadowClass: "shadow-pink-400/20", hoverShadowClass: "hover:shadow-pink-400/10", focusRingClass: "focus:ring-pink-400/50", focusBorderClass: "focus:border-pink-400/50",
            hoverTextClass: "hover:text-pink-400", hoverBgClass: "hover:bg-pink-400/10", hoverBorderClass: "hover:border-pink-400/50",
            hoverBgLightClass: "group-hover:bg-pink-400/40",
        },
        orange: {
            base: "orange-400", hover: "orange-500", light: "orange-400/20", border: "orange-400/30",
            baseClass: "border-orange-400 bg-orange-400", hoverClass: "hover:bg-orange-500",
            lightClass: "bg-orange-400/20", borderClass: "border-orange-400/30",
            textClass: "text-orange-400", bgClass: "bg-orange-400", bgHoverClass: "hover:bg-orange-500",
            shadowClass: "shadow-orange-400/20", hoverShadowClass: "hover:shadow-orange-400/10", focusRingClass: "focus:ring-orange-400/50", focusBorderClass: "focus:border-orange-400/50",
            hoverTextClass: "hover:text-orange-400", hoverBgClass: "hover:bg-orange-400/10", hoverBorderClass: "hover:border-orange-400/50",
            hoverBgLightClass: "group-hover:bg-orange-400/40",
        },
        cyan: {
            base: "cyan-400", hover: "cyan-500", light: "cyan-400/20", border: "cyan-400/30",
            baseClass: "border-cyan-400 bg-cyan-400", hoverClass: "hover:bg-cyan-500",
            lightClass: "bg-cyan-400/20", borderClass: "border-cyan-400/30",
            textClass: "text-cyan-400", bgClass: "bg-cyan-400", bgHoverClass: "hover:bg-cyan-500",
            shadowClass: "shadow-cyan-400/20", hoverShadowClass: "hover:shadow-cyan-400/10", focusRingClass: "focus:ring-cyan-400/50", focusBorderClass: "focus:border-cyan-400/50",
            hoverTextClass: "hover:text-cyan-400", hoverBgClass: "hover:bg-cyan-400/10", hoverBorderClass: "hover:border-cyan-400/50",
            hoverBgLightClass: "group-hover:bg-cyan-400/40",
        },
        red: {
            base: "red-400", hover: "red-500", light: "red-400/20", border: "red-400/30",
            baseClass: "border-red-400 bg-red-400", hoverClass: "hover:bg-red-500",
            lightClass: "bg-red-400/20", borderClass: "border-red-400/30",
            textClass: "text-red-400", bgClass: "bg-red-400", bgHoverClass: "hover:bg-red-500",
            shadowClass: "shadow-red-400/20", hoverShadowClass: "hover:shadow-red-400/10", focusRingClass: "focus:ring-red-400/50", focusBorderClass: "focus:border-red-400/50",
            hoverTextClass: "hover:text-red-400", hoverBgClass: "hover:bg-red-400/10", hoverBorderClass: "hover:border-red-400/50",
            hoverBgLightClass: "group-hover:bg-red-400/40",
        },
    };
    return colorMap[color];
};

export const getThemeClasses = (theme: Theme) => {
    if (theme === "light") {
        return {
            bg: "bg-[#f4f4f5]",
            text: "text-slate-900",
            sectionBg: "bg-white",
            card: "bg-white/80 backdrop-blur-xl",
            cardBg: "bg-white",
            divider: "border-slate-200",
            textSecondary: "text-slate-600",
            textTertiary: "text-slate-400",
            textMuted: "text-slate-500",
            hoverBg: "hover:bg-slate-200/50",
            item: "hover:bg-slate-200/50",
            activeBg: "bg-slate-200/80",
            active: "bg-slate-200/80",
            activeText: "text-slate-900",
            border: "border-slate-300/40",
            input: "bg-slate-100",
            inputBg: "bg-slate-100/50",
        };
    } else if (theme === "slate") {
        return {
            bg: "bg-[#0f172a]",
            text: "text-slate-100",
            sectionBg: "bg-[#1e293b]/50",
            card: "bg-slate-900/40 backdrop-blur-xl",
            cardBg: "bg-slate-800/40",
            divider: "border-slate-800",
            textSecondary: "text-slate-400",
            textTertiary: "text-slate-500",
            textMuted: "text-slate-400",
            hoverBg: "hover:bg-slate-800/50",
            item: "hover:bg-slate-800/50",
            activeBg: "bg-slate-800/80",
            active: "bg-slate-800/80",
            activeText: "text-slate-100",
            border: "border-slate-800",
            input: "bg-slate-800/50",
            inputBg: "bg-slate-900/50",
        };
    } else if (theme === "editor") {
        return {
            bg: "bg-[#1e1e1e]",
            text: "text-[#d4d4d4]",
            sectionBg: "bg-[#252526]/50",
            card: "bg-[#1a1a1a]/60 backdrop-blur-xl",
            cardBg: "bg-[#252526]/40",
            divider: "border-[#3e3e42]",
            textSecondary: "text-[#858585]",
            textTertiary: "text-[#6a6a6a]",
            textMuted: "text-[#858585]",
            hoverBg: "hover:bg-[#2a2d2e]/70",
            item: "hover:bg-[#2a2d2e]/70",
            activeBg: "bg-[#2a2d2e]/80",
            active: "bg-[#2a2d2e]/80",
            activeText: "text-[#d4d4d4]",
            border: "border-[#333333]",
            input: "bg-[#252526]",
            inputBg: "bg-[#1e1e1e]",
        };
    } else if (theme === "violet") {
        return {
            bg: "bg-[#1a1b26]",
            text: "text-[#a9b1d6]",
            sectionBg: "bg-[#24283b]/50",
            card: "bg-[#23173a]/50 backdrop-blur-xl",
            cardBg: "bg-[#24283b]/40",
            divider: "border-[#414868]/40",
            textSecondary: "text-[#787c99]",
            textTertiary: "text-[#565f89]",
            textMuted: "text-[#787c99]",
            hoverBg: "hover:bg-[#414868]/30",
            item: "hover:bg-[#414868]/30",
            activeBg: "bg-[#414868]/50",
            active: "bg-[#414868]/50",
            activeText: "text-[#c0caf5]",
            border: "border-[#414868]/30",
            input: "bg-[#2d1b4d]",
            inputBg: "bg-[#16161e]",
        };
    } else if (theme === "dark") {
        return {
            bg: "bg-[#0a0a0a]",
            text: "text-white",
            sectionBg: "bg-[#111111]/50",
            card: "bg-[#0a0a0a]/60 backdrop-blur-xl",
            cardBg: "bg-[#111111]/40",
            divider: "border-white/5",
            textSecondary: "text-gray-400",
            textTertiary: "text-gray-600",
            textMuted: "text-zinc-500",
            hoverBg: "hover:bg-white/5",
            item: "hover:bg-zinc-900/50",
            activeBg: "bg-white/10",
            active: "bg-zinc-900/80",
            activeText: "text-white",
            border: "border-white/5",
            input: "bg-zinc-900/50",
            inputBg: "bg-black",
        };
    } else {
        // Fallback to dark
        return {
            bg: "bg-[#0a0a0a]",
            text: "text-white",
            sectionBg: "bg-[#111111]/50",
            card: "bg-[#0a0a0a]/60 backdrop-blur-xl",
            cardBg: "bg-[#111111]/40",
            divider: "border-white/5",
            textSecondary: "text-gray-400",
            textTertiary: "text-gray-600",
            textMuted: "text-zinc-500",
            hoverBg: "hover:bg-white/5",
            item: "hover:bg-zinc-900/50",
            activeBg: "bg-white/10",
            active: "bg-zinc-900/80",
            activeText: "text-white",
            border: "border-white/5",
            input: "bg-zinc-900/50",
            inputBg: "bg-black",
        };
    }
};

export const getAccentColorHex = (color: AccentColor) => {
    const hexMap: Record<AccentColor, string> = {
        yellow: "#f5c518",
        blue: "#60a5fa",
        green: "#4ade80",
        purple: "#c084fc",
        pink: "#f472b6",
        orange: "#fb923c",
        cyan: "#22d3ee",
        red: "#f87171",
    };
    return hexMap[color];
};
