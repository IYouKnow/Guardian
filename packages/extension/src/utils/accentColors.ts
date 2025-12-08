import type { AccentColor } from "../types";

// Helper function to get accent color classes
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

