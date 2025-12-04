import { PasswordEntry } from "../types";
import PasswordCard from "./PasswordCard";

interface PasswordGridProps {
  passwords: PasswordEntry[];
  selectedPassword: string | null;
  showPasswords: { [key: string]: boolean };
  onSelectPassword: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePasswordVisibility: (id: string) => void;
}

export default function PasswordGrid({
  passwords,
  selectedPassword,
  showPasswords,
  onSelectPassword,
  onToggleFavorite,
  onTogglePasswordVisibility,
}: PasswordGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {passwords.map((password) => (
        <PasswordCard
          key={password.id}
          password={password}
          isSelected={selectedPassword === password.id}
          showPassword={showPasswords[password.id] || false}
          onSelect={() => onSelectPassword(selectedPassword === password.id ? "" : password.id)}
          onToggleFavorite={() => onToggleFavorite(password.id)}
          onTogglePasswordVisibility={() => onTogglePasswordVisibility(password.id)}
        />
      ))}
    </div>
  );
}

