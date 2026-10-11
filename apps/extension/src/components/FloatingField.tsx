import {
  useState,
  type ReactNode,
  type KeyboardEvent,
  type FocusEvent,
} from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
}

/**
 * Field with a label that rests inside the control and floats to the top on
 * focus or when filled. Colors come from tokens; the ring turns primary on
 * focus so keyboard users always see where they are.
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
}: FloatingFieldProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const labelFloated = focused || hasValue;

  return (
    <div
      className={cn(
        "relative flex h-11 items-stretch rounded-md border bg-card transition-colors",
        focused ? "border-ring ring-1 ring-ring" : "border-input"
      )}
    >
      {icon && (
        <span
          aria-hidden
          className={cn(
            "flex items-center pl-3 pr-1 transition-colors",
            focused || hasValue ? "text-primary" : "text-muted-foreground"
          )}
        >
          {icon}
        </span>
      )}

      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 flex items-center pl-3">
          <motion.label
            htmlFor={id}
            initial={false}
            animate={{ y: labelFloated ? -12 : 0, scale: labelFloated ? 0.8 : 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            style={{ transformOrigin: "left center" }}
            className={cn(
              "font-medium transition-colors",
              labelFloated ? "text-[13px]" : "text-sm",
              focused
                ? "text-primary"
                : hasValue
                  ? "text-muted-foreground"
                  : "text-muted-foreground/70"
            )}
          >
            {label}
          </motion.label>
        </div>

        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          spellCheck={spellCheck}
          autoComplete="off"
          className="relative h-full w-full bg-transparent pl-3 pr-2 pt-4 pb-1 text-sm font-medium text-foreground outline-none placeholder:text-transparent"
        />
      </div>

      {rightSlot && (
        <span
          className="flex items-center pr-2"
          onMouseDown={(e) => e.preventDefault()}
        >
          {rightSlot}
        </span>
      )}
    </div>
  );
}
