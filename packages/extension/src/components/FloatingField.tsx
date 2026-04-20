import { useState, type ReactNode, type KeyboardEvent, type FocusEvent } from "react";
import { motion } from "framer-motion";
import type { Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";
import { getThemeClasses } from "../utils/theme";

interface FloatingFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: ReactNode;
  rightSlot?: ReactNode;
  autoFocus?: boolean;
  autoCapitalize?: "on" | "off" | "none" | "sentences" | "words" | "characters";
  autoCorrect?: "on" | "off";
  spellCheck?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onKeyUp?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  theme?: Theme;
  accentColor?: AccentColor;
}

/**
 * Glass input field:
 *   - full rounded-lg container with a visible border and translucent fill
 *   - floating label is anchored INSIDE the container (no orphan text above a void)
 *   - on focus: border + label shift to accent, fill lifts subtly
 *   - optional leading icon (recolors to accent on focus/fill) and trailing slot
 */
export default function FloatingField({
  id,
  label,
  value,
  onChange,
  type = "text",
  icon,
  rightSlot,
  autoFocus,
  autoCapitalize,
  autoCorrect,
  spellCheck,
  onKeyDown,
  onKeyUp,
  onBlur,
  theme = "dark",
  accentColor = "yellow",
}: FloatingFieldProps) {
  const [focused, setFocused] = useState(false);
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor);

  const hasValue = value.length > 0;
  const labelFloated = focused || hasValue;
  const iconAccent = focused || hasValue;

  const handleFocus = () => setFocused(true);
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <div
      className={`relative flex items-stretch h-12 rounded-lg border transition-colors duration-200 ${
        focused
          ? `${accentClasses.borderClass} bg-white/[0.06]`
          : `${themeClasses.border} bg-white/[0.03]`
      }`}
    >
      {icon && (
        <span
          className={`pl-3 pr-1 flex items-center transition-colors duration-200 ${
            iconAccent ? accentClasses.textClass : themeClasses.textTertiary
          }`}
          aria-hidden
        >
          {icon}
        </span>
      )}

      <div className="relative flex-1">
        {/* Label stays inside the container: rests perfectly centered when
            empty, slides to the top-left and shrinks on focus / when filled.
            The flex wrapper does the centering so framer-motion's transform
            doesn't clobber a translate-based CSS centering. */}
        <div className="pointer-events-none absolute inset-0 flex items-center pl-3">
          <motion.label
            htmlFor={id}
            initial={false}
            animate={{
              y: labelFloated ? -13 : 0,
              scale: labelFloated ? 0.78 : 1,
            }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            style={{ transformOrigin: "left center" }}
            className={`font-medium tracking-wide transition-colors duration-200 ${
              labelFloated ? "text-[13px]" : "text-sm"
            } ${
              focused
                ? accentClasses.textClass
                : hasValue
                  ? themeClasses.textSecondary
                  : themeClasses.textTertiary
            }`}
          >
            {label}
          </motion.label>
        </div>

        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          spellCheck={spellCheck}
          autoComplete="off"
          className={`relative w-full h-full bg-transparent pl-3 pr-2 pt-4 pb-1 text-sm font-medium ${themeClasses.text} outline-none caret-current`}
        />
      </div>

      {rightSlot && (
        <span
          className="pr-2 flex items-center"
          /* Prevent the right slot (e.g. eye toggle button) from
             stealing focus when clicked, so the focus styling stays. */
          onMouseDown={(e) => e.preventDefault()}
        >
          {rightSlot}
        </span>
      )}
    </div>
  );
}
