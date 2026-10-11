import { useState } from "react";
import {
  AtSign,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Pencil,
  Trash2,
} from "lucide-react";
import type { PasswordEntry } from "@/types";
import { evaluatePasswordStrength } from "@guardian/core/crypto/generator";
import { AvatarTile } from "./AvatarTile";
import { CopyButton } from "./CopyButton";
import { StrengthMeter, type Strength } from "./StrengthMeter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface PasswordDetailProps {
  password: PasswordEntry;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  revealCensorSeconds?: number;
}

export default function PasswordDetail({
  password,
  onCopyUsername,
  onCopyPassword,
  onEdit,
  onDelete,
  revealCensorSeconds = 5,
}: PasswordDetailProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const strength: Strength | null = password.password
    ? (evaluatePasswordStrength(password.password) as Strength)
    : null;

  const masked = "•".repeat(Math.min(password.password.length, 16));

  const toggleReveal = () => {
    const next = !showPassword;
    setShowPassword(next);
    if (next && revealCensorSeconds > 0) {
      window.setTimeout(() => setShowPassword(false), revealCensorSeconds * 1000);
    }
  };

  const websiteHref = password.website
    ? password.website.startsWith("http")
      ? password.website
      : `https://${password.website}`
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 border-b border-border p-4">
        <AvatarTile
          name={password.title}
          favicon={password.favicon}
          className="h-11 w-11 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight">
            {password.title}
          </h1>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {password.website || "No website"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onEdit}
              aria-label="Edit entry"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && !confirmDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete entry"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && confirmDelete && (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete();
                  setConfirmDelete(false);
                }}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="scrollbar-hide flex-1 space-y-4 overflow-y-auto p-4">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border p-3">
            <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Username
              </p>
              <p className="select-all truncate text-xs font-medium">
                {password.username || "—"}
              </p>
            </div>
            <CopyButton
              onCopy={onCopyUsername}
              label="Copy username"
              disabled={!password.username}
            />
          </div>

          <div className="flex items-center gap-3 p-3">
            <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </p>
              <p className="select-all truncate font-mono text-xs font-medium">
                {showPassword ? password.password : masked}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleReveal}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-muted-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </Button>
            <CopyButton onCopy={onCopyPassword} label="Copy password" />
          </div>
          <Separator />
          <div className="p-3">
            <StrengthMeter strength={strength} />
          </div>
        </div>

        {websiteHref && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-ring/50"
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Website
              </p>
              <p className="truncate text-xs font-medium">{password.website}</p>
            </div>
          </a>
        )}

        {password.notes && (
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {password.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
