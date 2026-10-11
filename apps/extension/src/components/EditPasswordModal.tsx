import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { RefreshCw } from "lucide-react";
import type { PasswordEntry } from "@/types";
import { generatePassword } from "@guardian/core/crypto/generator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelect } from "./CategorySelect";
import { Spinner } from "./Spinner";

interface EditPasswordModalProps {
  isOpen: boolean;
  password: PasswordEntry;
  onClose: () => void;
  onSave: (updated: PasswordEntry) => Promise<void>;
}

export default function EditPasswordModal({
  isOpen,
  password: original,
  onClose,
  onSave,
}: EditPasswordModalProps) {
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState("Development");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && original) {
      setTitle(original.title || "");
      setUsername(original.username || "");
      setWebsite(original.website || "");
      setPassword(original.password || "");
      setCategory(original.category || "Development");
      setNotes(original.notes || "");
      setError("");
    }
  }, [isOpen, original]);

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
      const updated: PasswordEntry = {
        ...original,
        title: title.trim(),
        username: username.trim(),
        website: website.trim(),
        password,
        category: category || undefined,
        notes: notes.trim() || undefined,
        lastModified: new Date().toISOString(),
      };
      await onSave(updated);
      onClose();
    } catch (err) {
      console.error("Error editing password:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit password</DialogTitle>
          <DialogDescription>
            Update the details for {original.title}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-username">Username or email</Label>
            <Input
              id="edit-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-website">Website</Label>
            <Input
              id="edit-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-password">Password</Label>
            <div className="relative">
              <Input
                id="edit-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <Label htmlFor="edit-category">Category</Label>
            <CategorySelect
              id="edit-category"
              value={category}
              onChange={setCategory}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Spinner className="h-3.5 w-3.5" /> Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
