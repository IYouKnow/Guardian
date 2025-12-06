import { PasswordEntry, Theme, AccentColor } from "../types";
import PasswordCard from "./PasswordCard";

interface PasswordGridProps {
  passwords: PasswordEntry[];
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  onDelete: (id: string) => void;
  theme: Theme;
  itemSize: "small" | "medium" | "large";
  accentColor: AccentColor;
}

export default function PasswordGrid({
  passwords,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  theme,
  itemSize,
  accentColor,
}: PasswordGridProps) {
  const getGridCols = () => {
    if (itemSize === "small") {
      return "grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7";
    } else if (itemSize === "large") {
      return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    } else {
      return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
    }
  };

  const getGap = () => {
    if (itemSize === "small") {
      return "gap-3";
    } else if (itemSize === "large") {
      return "gap-6";
    } else {
      return "gap-4";
    }
  };

  return (
    <div className={`grid ${getGridCols()} ${getGap()} w-full min-w-0`}>
      {passwords.map((password) => (
        <PasswordCard
          key={password.id}
          password={password}
          onCopyUsername={() => onCopyUsername(password.username)}
          onCopyPassword={() => onCopyPassword(password.password)}
          onDelete={() => onDelete(password.id)}
          theme={theme}
          itemSize={itemSize}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
}

