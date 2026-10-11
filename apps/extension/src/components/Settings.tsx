import { useState } from "react";
import { LogOut, Palette, ShieldCheck } from "lucide-react";
import type { Theme, AccentColor } from "@/types";
import { ACCENTS, THEMES, resolveTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SettingsProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  accentColor: AccentColor;
  onAccentColorChange: (color: AccentColor) => void;
  clipboardClearSeconds: number;
  onClipboardClearSecondsChange: (seconds: number) => void;
  revealCensorSeconds: number;
  onRevealCensorSecondsChange: (seconds: number) => void;
  serverSessionExpiryDays: number;
  onServerSessionExpiryDaysChange: (days: number) => void;
  onLogout: () => void;
}

type Section = "appearance" | "security";

const NAV: { id: Section; label: string; icon: typeof Palette }[] = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: ShieldCheck },
];

function ThemeTile({
  value,
  label,
  accent,
  selected,
  onSelect,
}: {
  value: Theme;
  label: string;
  accent: AccentColor;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "rounded-lg border p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-ring/50"
      )}
    >
      <div
        data-theme={resolveTheme(value)}
        data-accent={accent}
        className="mb-1.5 h-12 w-full overflow-hidden rounded-md border border-border bg-background"
      >
        <div className="h-2.5 w-full bg-card" />
        <div className="flex items-center gap-1 p-1.5">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <div className="h-1.5 flex-1 rounded-full bg-muted" />
        </div>
        <div className="mx-1.5 h-1.5 w-2/3 rounded-full bg-muted" />
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function NumberRow({
  id,
  label,
  description,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-foreground">
          {label}
        </Label>
        {description ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 text-right"
      />
    </div>
  );
}

export default function Settings({
  theme,
  onThemeChange,
  accentColor,
  onAccentColorChange,
  clipboardClearSeconds,
  onClipboardClearSecondsChange,
  revealCensorSeconds,
  onRevealCensorSecondsChange,
  serverSessionExpiryDays,
  onServerSessionExpiryDaysChange,
  onLogout,
}: SettingsProps) {
  const [section, setSection] = useState<Section>("appearance");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-1 border-b border-border p-3">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={section === id}
            onClick={() => setSection(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              section === id
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </header>

      <div className="scrollbar-hide flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-md space-y-6">
          {section === "appearance" && (
            <>
              <section className="space-y-3">
                <Label className="text-foreground">Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {THEMES.map((t) => (
                    <ThemeTile
                      key={t.value}
                      value={t.value}
                      label={t.label}
                      accent={accentColor}
                      selected={theme === t.value}
                      onSelect={() => onThemeChange(t.value)}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <Label className="text-foreground">Accent</Label>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      aria-label={a.label}
                      aria-pressed={accentColor === a.value}
                      onClick={() => onAccentColorChange(a.value)}
                      style={{ background: a.hex }}
                      className={cn(
                        "h-7 w-7 rounded-full border border-black/10 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        accentColor === a.value
                          ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                          : "hover:opacity-90"
                      )}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {section === "security" && (
            <>
              <section className="space-y-1">
                <NumberRow
                  id="set-clipboard"
                  label="Clear clipboard after"
                  description="Seconds before copied passwords are cleared (0 = never)"
                  value={clipboardClearSeconds}
                  onChange={onClipboardClearSecondsChange}
                  min={0}
                  max={300}
                />
                <NumberRow
                  id="set-reveal"
                  label="Hide revealed password after"
                  description="Seconds before a revealed password hides again (0 = never)"
                  value={revealCensorSeconds}
                  onChange={onRevealCensorSecondsChange}
                  min={0}
                  max={300}
                />
                <NumberRow
                  id="set-session"
                  label="Server session expiry"
                  description="Days before a server session must be re-authenticated"
                  value={serverSessionExpiryDays}
                  onChange={onServerSessionExpiryDaysChange}
                  min={1}
                  max={365}
                />
              </section>

              <section className="space-y-3 border-t border-border pt-4">
                <div>
                  <Label className="text-foreground">Lock vault</Label>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Sign out and clear the local session.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={onLogout}
                  className="w-full gap-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Lock vault
                </Button>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
