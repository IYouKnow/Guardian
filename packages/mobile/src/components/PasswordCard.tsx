import { useEffect, useRef, useState } from "react";
import type { PasswordEntry } from "../types";
import { getAccentColorClasses } from "@guardian/shared/themes";
import { getThemeClasses, type MobileTheme } from "../utils/theme";
import type { AccentColor } from "@guardian/shared/themes";

interface PasswordCardProps {
  password: PasswordEntry;
  onCardClick: () => void;
  onCopyUsername: () => Promise<boolean> | boolean;
  onCopyPassword: () => Promise<boolean> | boolean;
  onDelete: () => void;
  autofillMode?: boolean;
  theme?: MobileTheme;
  accentColor: AccentColor;
  itemSize: "small" | "medium" | "large";
}

function formatWebsiteLabel(input: string): string {
  const raw = (input || "").trim();
  if (!raw) return "";

  try {
    const withProtocol = raw.includes("://") ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || raw;
  }
}

export default function PasswordCard({
  password,
  onCardClick,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  autofillMode = false,
  theme = "dark",
  accentColor,
  itemSize,
}: PasswordCardProps) {
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);
  const websiteLabel = formatWebsiteLabel(password.website);
  const title = (password.title || "").trim() || "Untitled";
  const passwordMask = "••••••••••••";
  const [copied, setCopied] = useState<"username" | "password" | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  const sizeClasses = (() => {
    if (itemSize === "small") {
      return {
        padding: "p-3",
        avatar: "w-10 h-10",
        title: "text-sm",
        meta: "text-[10px]",
        actions: "w-9 h-9",
        actionIcon: "w-4 h-4",
      };
    }
    if (itemSize === "large") {
      return {
        padding: "p-5",
        avatar: "w-12 h-12",
        title: "text-base",
        meta: "text-xs",
        actions: "w-11 h-11",
        actionIcon: "w-5 h-5",
      };
    }
    return {
      padding: "p-4",
      avatar: "w-11 h-11",
      title: "text-[15px]",
      meta: "text-[11px]",
      actions: "w-10 h-10",
      actionIcon: "w-[18px] h-[18px]",
    };
  })();

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const markCopied = (kind: "username" | "password") => {
    setCopied(kind);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => {
      setCopied(null);
      copiedTimerRef.current = null;
    }, 1200);
  };

  return (
    <div
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardClick();
        }
      }}
      className={`group relative ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl transition-all shadow-sm active:scale-[0.99] cursor-pointer overflow-hidden focus:outline-none focus:ring-2 ${accentClasses.focusRingClass}`}
    >
      <div className={`absolute inset-x-0 top-0 h-px ${accentClasses.lightClass} opacity-60`} />

      <div className={`${sizeClasses.padding} flex items-center gap-3`}>
        <div className="relative flex-shrink-0">
          <div
            className={`${sizeClasses.avatar} rounded-2xl bg-gradient-to-br ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center ${accentClasses.textClass} font-bold text-sm shadow-inner`}
          >
            {title.charAt(0).toUpperCase()}
          </div>
          {password.breached && (
            <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 ${themeClasses.border}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className={`font-semibold ${themeClasses.text} ${sizeClasses.title} leading-tight truncate`}>
                  {title}
                </h3>
                {password.breached && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-red-400">
                    Breached
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-2 min-w-0">
                <p className={`${sizeClasses.meta} font-bold uppercase tracking-widest ${themeClasses.textMuted} truncate`}>
                  {websiteLabel || "No website"}
                </p>
                <span className={`${sizeClasses.meta} ${themeClasses.textTertiary}`}>•</span>
                <p className={`${sizeClasses.meta} ${themeClasses.textSecondary} truncate`}>
                  {password.username || "No username"}
                </p>
              </div>

              <p className={`mt-1 ${sizeClasses.meta} ${themeClasses.textTertiary} font-mono tracking-widest`}>
                {passwordMask}
              </p>
              {autofillMode && (
                <p className={`mt-2 ${sizeClasses.meta} font-semibold ${accentClasses.textClass}`}>
                  Tap to autofill
                </p>
              )}
            </div>

            {!autofillMode && (
              <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await Promise.resolve(onCopyUsername());
                  if (ok !== false) markCopied("username");
                }}
                className={`${sizeClasses.actions} flex items-center justify-center rounded-2xl border transition-all active:scale-95 ${
                  copied === "username"
                    ? `${accentClasses.lightClass} ${accentClasses.borderClass} ${accentClasses.textClass} border shadow-sm`
                    : `border-transparent ${themeClasses.hoverBg} ${accentClasses.textClass}`
                }`}
                title={copied === "username" ? "Copied" : "Copy username"}
                aria-label={copied === "username" ? "Copied username" : "Copy username"}
              >
                {copied === "username" ? (
                  <svg className={sizeClasses.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className={sizeClasses.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </button>

              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await Promise.resolve(onCopyPassword());
                  if (ok !== false) markCopied("password");
                }}
                className={`${sizeClasses.actions} flex items-center justify-center rounded-2xl border transition-all active:scale-95 ${
                  copied === "password"
                    ? `${accentClasses.lightClass} ${accentClasses.borderClass} ${accentClasses.textClass} border shadow-sm`
                    : `border-transparent ${themeClasses.hoverBg} ${accentClasses.textClass}`
                }`}
                title={copied === "password" ? "Copied" : "Copy password"}
                aria-label={copied === "password" ? "Copied password" : "Copy password"}
              >
                {copied === "password" ? (
                  <svg className={sizeClasses.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className={sizeClasses.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className={`${sizeClasses.actions} flex items-center justify-center rounded-2xl text-red-400 hover:bg-red-500/10 active:bg-red-500/20 active:scale-95 transition-all`}
                title="Delete"
                aria-label="Delete"
              >
                <svg className={sizeClasses.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
