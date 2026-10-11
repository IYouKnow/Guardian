import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarTileProps {
  name: string;
  favicon?: string;
  className?: string;
}

export function AvatarTile({ name, favicon, className }: AvatarTileProps) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <Avatar
      className={cn(
        "h-8 w-8 rounded-lg border border-border bg-secondary",
        className
      )}
    >
      {favicon ? <AvatarImage src={favicon} alt="" /> : null}
      <AvatarFallback className="bg-secondary text-foreground/80">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
