import type { PasswordEntry } from "../types";
import PasswordCard from "./PasswordCard";
import type { MobileTheme } from "../utils/theme";

interface PasswordGridProps {
  passwords: PasswordEntry[];
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  onDelete: (id: string) => void;
  theme?: MobileTheme;
}

export default function PasswordGrid({
  passwords,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  theme = "dark",
}: PasswordGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {passwords.map((password) => (
        <PasswordCard
          key={password.id}
          password={password}
          onCopyUsername={() => onCopyUsername(password.username)}
          onCopyPassword={() => onCopyPassword(password.password)}
          onDelete={() => onDelete(password.id)}
          theme={theme}
        />
      ))}
    </div>
  );
}
