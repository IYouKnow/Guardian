import { useState, type ReactNode } from "react";
import type { FormEvent } from "react";
import {
  AtSign,
  Check,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  RefreshCw,
  Type,
} from "lucide-react";
import { motion } from "framer-motion";
import type { PasswordEntry } from "@/types";
import {
  generatePassword,
  evaluatePasswordStrength,
} from "@guardian/core/crypto/generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarTile } from "./AvatarTile";
import { Spinner } from "./Spinner";
import { StrengthMeter, type Strength } from "./StrengthMeter";
import { cn } from "@/lib/utils";

interface PasswordPanelProps {
  mode: "add" | "edit";
  initial?: Partial<PasswordEntry>;
  onSubmit: (entry: PasswordEntry) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES = [
  "Development",
  "Email",
  "Social",
  "Entertainment",
  "Finance",
  "Shopping",
  "Other",
];

const COPY = {
  add: { title: "New entry", subtitle: "Create a password", submit: "Save password" },
  edit: { title: "Edit entry", subtitle: "Update this password", submit: "Save changes" },
} as const;

const sectionVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
};

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <motion.section variants={sectionVariants} className="space-y-2.5">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h3>
      <div className="space-y-2.5">{children}</div>
    </motion.section>
  );
}

function IconInput({
  id,
  icon,
  className,
  ...props
}: { id: string; icon: ReactNode } & React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icon}
      </span>
      <Input id={id} className={cn("pl-8", className)} {...props} />
    </div>
  );
}

export default function PasswordPanel({
  mode,
  initial,
  onSubmit,
  onCancel,
}: PasswordPanelProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Development");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const copy = COPY[mode];
  const heroName = title.trim() || initial?.title || copy.title;
  const strength: Strength | null = password
    ? (evaluatePasswordStrength(password) as Strength)
    : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const entry: PasswordEntry = {
        ...(mode === "edit" ? (initial as PasswordEntry) : {}),
        id: mode === "edit" ? (initial as PasswordEntry).id : crypto.randomUUID(),
        title: title.trim(),
        username: username.trim(),
        website: website.trim(),
        password,
        category: category || undefined,
        notes: notes.trim() || undefined,
        favorite: initial?.favorite ?? false,
        breached: initial?.breached ?? false,
        favicon: initial?.favicon,
        lastModified: new Date().toISOString(),
      };
      await onSubmit(entry);
    } catch (err) {
      console.error("Error saving password:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 border-b border-border p-4">
        <AvatarTile
          name={heroName}
          favicon={initial?.favicon}
          className="h-10 w-10 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight">
            {heroName}
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{copy.subtitle}</p>
        </div>
      </header>

      <div className="scrollbar-hide flex-1 overflow-y-auto p-4">
        <motion.form
          id="password-form"
          onSubmit={handleSubmit}
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="space-y-5"
        >
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          <Section label="Account">
            <div className="space-y-1.5">
              <Label htmlFor="pf-title">Title</Label>
              <IconInput
                id="pf-title"
                icon={<Type />}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. GitHub"
                required
                autoFocus={mode === "add"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-username">Username or email</Label>
              <IconInput
                id="pf-username"
                icon={<AtSign />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-website">Website</Label>
              <IconInput
                id="pf-website"
                icon={<Globe />}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="example.com"
              />
            </div>
          </Section>

          <Section label="Security">
            <div className="space-y-1.5">
              <Label htmlFor="pf-password">Password</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
                  <KeyRound />
                </span>
                <Input
                  id="pf-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="pl-8 pr-16 font-mono"
                />
                <div className="absolute right-1 top-1/2 flex -translate-y-1/2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="text-muted-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setPassword(generatePassword({ length: 20 }))}
                    aria-label="Generate random password"
                    className="text-muted-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <StrengthMeter strength={strength} className="pt-0.5" />
            </div>
          </Section>

          <Section label="Organize">
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      category === c
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-ring/50 hover:text-foreground"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section label="Notes">
            <Textarea
              id="pf-notes"
              aria-label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes…"
              rows={3}
            />
          </Section>
        </motion.form>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          form="password-form"
          type="submit"
          disabled={isSubmitting}
          className="min-w-32 gap-2"
        >
          {isSubmitting ? (
            <>
              <Spinner className="h-3.5 w-3.5" /> Saving…
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              {copy.submit}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
