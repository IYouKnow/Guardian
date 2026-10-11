import { useState, useEffect } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import {
  generatePassword,
  evaluatePasswordStrength,
  type GeneratorOptions,
} from "@guardian/core/crypto/generator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "./CopyButton";
import { StrengthMeter, type Strength } from "./StrengthMeter";

const TOGGLES: { key: keyof GeneratorOptions; label: string }[] = [
  { key: "uppercase", label: "Uppercase (A-Z)" },
  { key: "lowercase", label: "Lowercase (a-z)" },
  { key: "numbers", label: "Numbers (0-9)" },
  { key: "symbols", label: "Symbols (!@#)" },
  { key: "excludeAmbiguous", label: "Exclude ambiguous (0O1)" },
];

export default function Generator() {
  const [options, setOptions] = useState<GeneratorOptions>({
    length: 20,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
  });

  const [password, setPassword] = useState("");

  const strength: Strength | null = password
    ? (evaluatePasswordStrength(password) as Strength)
    : null;

  const length = options.length ?? 20;

  const regenerate = () => {
    try {
      setPassword(generatePassword(options));
    } catch {
      setPassword("");
    }
  };

  useEffect(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  return (
    <div className="scrollbar-hide h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-md space-y-4">
        <header className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card">
            <KeyRound className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Generator</h1>
            <p className="text-[11px] text-muted-foreground">Password tools</p>
          </div>
        </header>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 truncate font-mono text-base tracking-wide">
              {password || "—"}
            </p>
            <CopyButton value={password} label="Copy password" />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={regenerate}
              aria-label="Regenerate password"
              className="text-muted-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <StrengthMeter strength={strength} />
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="gen-length">Length</Label>
              <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                {length}
              </span>
            </div>
            <Slider
              id="gen-length"
              min={4}
              max={64}
              step={1}
              value={[length]}
              onValueChange={(values) =>
                setOptions((o) => ({ ...o, length: values[0] ?? length }))
              }
            />
          </div>

          <div className="space-y-1">
            {TOGGLES.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between py-1.5"
              >
                <Label htmlFor={`gen-${key}`} className="cursor-pointer">
                  {label}
                </Label>
                <Switch
                  id={`gen-${key}`}
                  checked={!!options[key]}
                  onCheckedChange={(checked) =>
                    setOptions((o) => ({ ...o, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
