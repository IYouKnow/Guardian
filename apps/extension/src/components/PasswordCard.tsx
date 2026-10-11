import type { PasswordEntry } from "@/types";
import { AvatarTile } from "./AvatarTile";
import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";

interface PasswordCardProps {
  password: PasswordEntry;
  onCardClick: () => void;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  isActive?: boolean;
}

export default function PasswordCard({
  password,
  onCardClick,
  onCopyUsername,
  onCopyPassword,
  isActive = false,
}: PasswordCardProps) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border p-2 pr-2 transition-colors",
        isActive
          ? "border-primary/40 bg-accent"
          : "border-transparent hover:border-border hover:bg-accent/60"
      )}
    >
      {/* Full-row hit target sits under the content for selection + keyboard. */}
      <button
        type="button"
        onClick={onCardClick}
        aria-label={`Open ${password.title}`}
        aria-current={isActive}
        className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-3">
        <div className="relative shrink-0">
          <AvatarTile name={password.title} favicon={password.favicon} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xs font-semibold text-foreground">
            {password.title}
          </h3>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {password.username || password.website || "No details"}
          </p>
        </div>
        {password.breached && (
          <span
            title="Found in a breach"
            className="h-2 w-2 shrink-0 rounded-full bg-destructive"
          />
        )}
      </div>

      <div className="relative z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <CopyButton
          onCopy={onCopyUsername}
          label="Copy username"
          disabled={!password.username}
        />
        <CopyButton onCopy={onCopyPassword} label="Copy password" />
      </div>
    </div>
  );
}
