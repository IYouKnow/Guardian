import { PasswordEntry } from "../types";
import PasswordCard from "./PasswordCard";

interface PasswordGridProps {
  passwords: PasswordEntry[];
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  onDelete: (id: string) => void;
  theme: "dark" | "half-dark" | "light";
}

export default function PasswordGrid({
  passwords,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  theme,
}: PasswordGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

