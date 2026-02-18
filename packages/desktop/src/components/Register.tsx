import RegisterWizard from "./RegisterWizard";
import { Theme, AccentColor } from "../types";

interface RegisterProps {
  mode: "local" | "server";
  onRegister: (data: any) => Promise<void>;
  onBackToLogin: () => void;
  theme: Theme;
  accentColor: AccentColor;
}

export default function Register({ mode, onRegister, onBackToLogin, theme, accentColor }: RegisterProps) {
  return <RegisterWizard mode={mode} onRegister={onRegister} onBackToLogin={onBackToLogin} initialTheme={theme} initialAccentColor={accentColor} />;
}

