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

interface AddPasswordPanelProps {
  onAddPassword: (password: PasswordEntry) => Promise<void>;
  onCancel: () => void;
}

export default function AddPasswordPanel({
  onAddPassword,
  onCancel,
}: AddPasswordPanelProps) {
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState("Development");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      const newPassword: PasswordEntry = {
        id: crypto.randomUUID(),
        title: title.trim(),
        username: username.trim(),
        website: website.trim(),
        password,
        category: category || undefined,
        favorite: false,
        lastModified: new Date().toISOString(),
        notes: notes.trim() || undefined,
        breached: false,
      };
      await onAddPassword(newPassword);
    } catch (err) {
      console.error("Error adding password:", err);
      setError("Failed to save password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between border-b border-border p-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Add password</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Create a new entry
          </p>
        </div>
      </header>

      <div className="scrollbar-hide flex-1 overflow-y-auto p-4">
        <form id="add-password-form" onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="add-title">Title</Label>
            <Input
              id="add-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GitHub"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-username">Username or email</Label>
            <Input
              id="add-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-website">Website</Label>
            <Input
              id="add-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-password">Password</Label>
            <div className="relative">
              <Input
                id="add-password"
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
            <Label htmlFor="add-category">Category</Label>
            <CategorySelect
              id="add-category"
              value={category}
              onChange={setCategory}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-notes">Notes</Label>
            <Textarea
              id="add-notes"
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
          form="add-password-form"
          type="submit"
          disabled={isSubmitting}
          className="flex-1 gap-2"
        >
          {isSubmitting ? (
            <>
              <Spinner className="h-3.5 w-3.5" /> Saving…
            </>
          ) : (
            "Save password"
          )}
        </Button>
      </div>
    </div>
  );
}
