import type { PasswordEntry } from "@/types";
import PasswordCard from "./PasswordCard";
import { motion, AnimatePresence } from "framer-motion";

interface PasswordGridProps {
  passwords: PasswordEntry[];
  onCardClick: (password: PasswordEntry) => void;
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  selectedId?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export default function PasswordGrid({
  passwords,
  onCardClick,
  onCopyUsername,
  onCopyPassword,
  selectedId,
}: PasswordGridProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex w-full flex-col gap-0.5"
    >
      <AnimatePresence mode="popLayout">
        {passwords.map((password) => (
          <motion.div key={password.id} variants={item} layout>
            <PasswordCard
              password={password}
              onCardClick={() => onCardClick(password)}
              onCopyUsername={() => onCopyUsername(password.username)}
              onCopyPassword={() => onCopyPassword(password.password)}
              isActive={password.id === selectedId}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
