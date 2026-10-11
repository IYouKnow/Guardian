import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  /** Value to write to the clipboard. Ignored when `onCopy` is provided. */
  value?: string;
  /** Custom copy handler (e.g. so callers can apply clipboard auto-clear). */
  onCopy?: () => void;
  label?: string;
  size?: "icon" | "icon-sm";
  className?: string;
  disabled?: boolean;
}

export function CopyButton({
  value,
  onCopy,
  label = "Copy",
  size = "icon-sm",
  className,
  disabled,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (onCopy) onCopy();
      else if (value) await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={size}
          disabled={disabled}
          onClick={copy}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={copied ? "Copied" : label}
          className={cn("text-muted-foreground hover:text-foreground", className)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? "check" : "copy"}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </motion.span>
          </AnimatePresence>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : label}</TooltipContent>
    </Tooltip>
  );
}
