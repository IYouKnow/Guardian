import RegisterWizard from "./RegisterWizard";
import { Theme, AccentColor } from "../types";

interface RegisterProps {
  onRegister: (vaultPath: string, masterPassword: string, theme: Theme, accentColor: AccentColor) => Promise<void>;
  onBackToLogin: () => void;
}

export default function Register({ onRegister, onBackToLogin }: RegisterProps) {
  return <RegisterWizard onRegister={onRegister} onBackToLogin={onBackToLogin} />;
}

