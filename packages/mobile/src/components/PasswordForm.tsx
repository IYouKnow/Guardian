import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { PasswordEntry } from "../types";
import type { MobileTheme } from "../utils/theme";
import { getThemeClasses } from "../utils/theme";
import { getAccentColorClasses, type AccentColor } from "@guardian/shared/themes";
import { normalizeIcon } from "@guardian/shared";

type Draft = Pick<PasswordEntry, "title" | "website" | "username" | "password" | "notes" | "favicon">;

type Props = {
  mode: "add" | "edit";
  theme: MobileTheme;
  accentColor: AccentColor;
  initial?: PasswordEntry;
  onCancel: () => void;
  onSave: (draft: Draft) => void;
};

export default function PasswordForm({ mode, theme, accentColor, initial, onCancel, onSave }: Props) {
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultDraft = useMemo<Draft>(
    () => ({
      title: initial?.title ?? "",
      website: initial?.website ?? "",
      username: initial?.username ?? "",
      password: initial?.password ?? "",
      notes: initial?.notes ?? "",
      favicon: initial?.favicon,
    }),
    [initial],
  );

  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [error, setError] = useState("");
  const [iconBusy, setIconBusy] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!draft.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!draft.password.trim()) {
      setError("Password is required.");
      return;
    }
    onSave({
      title: draft.title.trim(),
      website: draft.website.trim(),
      username: draft.username.trim(),
      password: draft.password,
      notes: (draft.notes ?? "").trim(),
      favicon: draft.favicon,
    });
  };

  const handleIconPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for the icon.");
      return;
    }

    setError("");
    setIconBusy(true);
    try {
      const dataUrl = await normalizeIcon(file);
      if (!dataUrl) {
        throw new Error("Couldn't prepare that icon. Try a different image.");
      }

      setDraft((current) => ({ ...current, favicon: dataUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the selected icon.");
    } finally {
      setIconBusy(false);
    }
  };

  const iconTitle = draft.title.trim() || "Saved app";
  const iconSubtitle = (draft.website || "").replace(/^androidapp:\/\//, "") || "Custom app icon";

  return (
    <div className={`flex flex-col h-full ${themeClasses.bg} ${themeClasses.text}`}>
      <div className="flex items-center justify-between gap-4 px-4 pb-4 pt-12">
        <button
          onClick={onCancel}
          className={`p-2 rounded-xl ${themeClasses.hoverBg} ${themeClasses.textSecondary} active:scale-95 transition-all`}
          title="Back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-lg font-bold">{mode === "add" ? "Add Password" : "Edit Password"}</h2>
        <div className="w-10" />
      </div>

      <form onSubmit={submit} className="flex-1 overflow-y-auto px-4 pb-24">
        <div className={`${themeClasses.card} border ${themeClasses.border} rounded-2xl p-4 shadow-sm`}>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className={`block text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>Icon</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconPick}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={iconBusy}
                    className={`rounded-xl border ${themeClasses.border} px-3 py-2 text-[11px] font-semibold ${accentClasses.textClass} disabled:opacity-60`}
                  >
                    {draft.favicon ? "Replace" : "Add icon"}
                  </button>
                  {draft.favicon && (
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setDraft((current) => ({ ...current, favicon: undefined }));
                      }}
                      className={`rounded-xl border ${themeClasses.border} px-3 py-2 text-[11px] font-semibold ${themeClasses.textSecondary}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className={`mt-2 flex items-center gap-3 ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-3`}>
                <div className={`w-11 h-11 rounded-2xl overflow-hidden shrink-0 border ${themeClasses.border} ${accentClasses.lightClass} ${accentClasses.textClass} flex items-center justify-center font-bold text-sm`}>
                  {draft.favicon ? (
                    <img src={draft.favicon} alt="" className="w-full h-full object-cover" />
                  ) : (
                    iconTitle.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{iconTitle}</p>
                  <p className={`text-[11px] ${themeClasses.textSecondary} truncate`}>
                    {iconBusy ? "Loading selected image..." : iconSubtitle}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>Title</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className={`mt-2 w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 ${accentClasses.focusRingClass} ${accentClasses.focusBorderClass}`}
                placeholder="e.g. Google"
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>Website</label>
              <input
                value={draft.website}
                onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
                className={`mt-2 w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 ${accentClasses.focusRingClass} ${accentClasses.focusBorderClass}`}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>Username</label>
              <input
                value={draft.username}
                onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                className={`mt-2 w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 ${accentClasses.focusRingClass} ${accentClasses.focusBorderClass}`}
                placeholder="username@email.com"
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>Password</label>
              <input
                value={draft.password}
                onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                className={`mt-2 w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-3 text-sm font-mono focus:outline-none focus:ring-2 ${accentClasses.focusRingClass} ${accentClasses.focusBorderClass}`}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>Notes</label>
              <textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                className={`mt-2 w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-3 text-sm min-h-[110px] focus:outline-none focus:ring-2 ${accentClasses.focusRingClass} ${accentClasses.focusBorderClass}`}
                placeholder="Optional"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        </div>

        <button
          type="submit"
          className={`mt-4 w-full ${accentClasses.bgClass} ${accentClasses.onContrastClass} rounded-xl py-3 px-4 font-semibold transition-all active:scale-[0.99]`}
        >
          {mode === "add" ? "Add" : "Save"}
        </button>
      </form>
    </div>
  );
}
