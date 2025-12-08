import { PasswordEntry, Theme, AccentColor } from "../types";
import PasswordCard from "./PasswordCard";

interface PasswordGridProps {
  passwords: PasswordEntry[];
  onCardClick: (password: PasswordEntry) => void;
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  theme: Theme;
  accentColor: AccentColor;
}

export default function PasswordGrid({
  passwords,
  onCardClick,
  onCopyUsername,
  onCopyPassword,
  theme,
  accentColor,
}: PasswordGridProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {passwords.map((password) => (
        <PasswordCard
          key={password.id}
          password={password}
          onCardClick={() => onCardClick(password)}
          onCopyUsername={() => onCopyUsername(password.username)}
          onCopyPassword={() => onCopyPassword(password.password)}
          theme={theme}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
}
