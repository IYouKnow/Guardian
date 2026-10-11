import { useState } from "react";
import type { FormEvent } from "react";
import { RefreshCw } from "lucide-react";
import type { PasswordEntry } from "@/types";
import { generatePassword } from "@guardian/core/crypto/generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelect } from "./CategorySelect";
import { Spinner } from "./Spinner";

interface PasswordPanelProps {
  mode: "add" | "edit";
  initial?: Partial<PasswordEntry>;
  onSubmit: (entry: PasswordEntry) => Promise<void>;
  onCancel: () => void;
}

const COPY = {
  add: { title: "Add password", subtitle: "Create a new entry", submit: "Save password" },
  edit: { title: "Edit password", subtitle: "Update this entry", submit: "Save changes" },
} as const;

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const copy = COPY[mode];

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
      <header className="shrink-0 border-b border-border p-4">
        <h1 className="text-base font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{copy.subtitle}</p>
      </header>

      <div className="scrollbar-hide flex-1 overflow-y-auto p-4">
        <form id="password-form" onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pf-title">Title</Label>
            <Input
              id="pf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GitHub"
              required
              autoFocus={mode === "add"}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-username">Username or email</Label>
            <Input
              id="pf-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-website">Website</Label>
            <Input
              id="pf-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-password">Password</Label>
            <div className="relative">
              <Input
                id="pf-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="pr-9 font-mono"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setPassword(generatePassword({ length: 20 }))}
                aria-label="Generate random password"
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-category">Category</Label>
            <CategorySelect id="pf-category" value={category} onChange={setCategory} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-notes">Notes</Label>
            <Textarea
              id="pf-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes…"
              rows={3}
            />
          </div>
        </form>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border p-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          form="password-form"
          type="submit"
          disabled={isSubmitting}
          className="flex-1 gap-2"
        >
          {isSubmitting ? (
            <>
              <Spinner className="h-3.5 w-3.5" /> Saving…
            </>
          ) : (
            copy.submit
          )}
        </Button>
      </div>
    </div>
  );
}
