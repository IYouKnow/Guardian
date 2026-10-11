import { cn } from "@/lib/utils";

export type Strength = "weak" | "medium" | "strong" | "very-strong";

const LABELS: Record<Strength, string> = {
  weak: "Weak",
  medium: "Fair",
  strong: "Strong",
  "very-strong": "Very strong",
};

const SCORE: Record<Strength, number> = {
  weak: 1,
  medium: 2,
  strong: 3,
  "very-strong": 4,
};

interface StrengthMeterProps {
  strength: Strength | null;
  className?: string;
}

export function StrengthMeter({ strength, className }: StrengthMeterProps) {
  const score = strength ? SCORE[strength] : 0;
  const tone = score <= 2 ? "bg-destructive" : "bg-primary";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex flex-1 gap-1" role="presentation">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < score ? tone : "bg-muted"
            )}
          />
        ))}
      </div>
      <span className="w-16 shrink-0 text-right text-[10px] font-medium text-muted-foreground">
        {strength ? LABELS[strength] : "—"}
      </span>
    </div>
  );
}
