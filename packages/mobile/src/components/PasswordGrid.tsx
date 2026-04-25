import type { PasswordEntry } from "../types";
import PasswordCard from "./PasswordCard";
import type { MobileTheme } from "../utils/theme";
import type { AccentColor } from "@guardian/shared/themes";

interface PasswordGridProps {
  passwords: PasswordEntry[];
  onCardClick: (id: string) => void;
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  onDelete: (id: string) => void;
  theme?: MobileTheme;
  accentColor: AccentColor;
}

export default function PasswordGrid({
  passwords,
  onCardClick,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  theme = "dark",
  accentColor,
}: PasswordGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
        />
      ))}
    </div>
  );
}
