import type { PasswordEntry, Theme, AccentColor } from "../types";
import PasswordCard from "./PasswordCard";
import { motion, AnimatePresence } from "framer-motion";

interface PasswordGridProps {
  passwords: PasswordEntry[];
  onCardClick: (password: PasswordEntry) => void;
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  theme: Theme;
  accentColor: AccentColor;
  selectedId?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export default function PasswordGrid({
  passwords,
  onCardClick,
  onCopyUsername,
  onCopyPassword,
  theme,
  accentColor,
  selectedId,
}: PasswordGridProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-2 w-full"
    >
      <AnimatePresence mode="popLayout">
        {passwords.map((password) => (
          <motion.div key={password.id} variants={item} layout>
            <PasswordCard
              password={password}
              onCardClick={() => onCardClick(password)}
              onCopyUsername={() => onCopyUsername(password.username)}
              onCopyPassword={() => onCopyPassword(password.password)}
              theme={theme}
              accentColor={accentColor}
              isActive={password.id === selectedId}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
