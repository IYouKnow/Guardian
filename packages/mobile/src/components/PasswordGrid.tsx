import type { PasswordEntry } from "../types";
import PasswordCard from "./PasswordCard";
import type { MobileTheme } from "../utils/theme";
import type { AccentColor } from "@guardian/shared/themes";

interface PasswordGridProps {
  passwords: PasswordEntry[];
  onCardClick: (id: string) => void;
  onCopyUsername: (username: string) => Promise<boolean> | boolean;
  onCopyPassword: (password: string) => Promise<boolean> | boolean;
  onDelete: (id: string) => void;
  theme?: MobileTheme;
  accentColor: AccentColor;
  itemSize: "small" | "medium" | "large";
}

export default function PasswordGrid({
  passwords,
  onCardClick,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  theme = "dark",
  accentColor,
  itemSize,
}: PasswordGridProps) {
  const gapClass =
    itemSize === "small" ? "gap-2 sm:gap-2" : itemSize === "large" ? "gap-4 sm:gap-4" : "gap-3 sm:gap-3";

  return (
    <div className={`flex flex-col ${gapClass} sm:grid sm:grid-cols-2 lg:grid-cols-3`}>
      {passwords.map((password) => (
        <PasswordCard
          key={password.id}
          password={password}
          onCardClick={() => onCardClick(password.id)}
          onCopyUsername={() => onCopyUsername(password.username)}
          onCopyPassword={() => onCopyPassword(password.password)}
          onDelete={() => onDelete(password.id)}
          theme={theme}
          accentColor={accentColor}
          itemSize={itemSize}
        />
      ))}
    </div>
  );
}
