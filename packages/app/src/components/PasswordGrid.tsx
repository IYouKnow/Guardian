import { PasswordEntry } from "../types";
import PasswordCard from "./PasswordCard";

interface PasswordGridProps {
  passwords: PasswordEntry[];
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  onDelete: (id: string) => void;
}

export default function PasswordGrid({
  passwords,
  onCopyUsername,
  onCopyPassword,
  onDelete,
}: PasswordGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {passwords.map((password) => (
        <PasswordCard
          key={password.id}
          password={password}
          onCopyUsername={() => onCopyUsername(password.username)}
          onCopyPassword={() => onCopyPassword(password.password)}
          onDelete={() => onDelete(password.id)}
        />
      ))}
    </div>
  );
}
