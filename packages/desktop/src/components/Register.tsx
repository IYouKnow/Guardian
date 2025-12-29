import RegisterWizard from "./RegisterWizard";

interface RegisterProps {
  mode: "local" | "server";
  onRegister: (data: any) => Promise<void>;
  onBackToLogin: () => void;
}

export default function Register({ mode, onRegister, onBackToLogin }: RegisterProps) {
  return <RegisterWizard mode={mode} onRegister={onRegister} onBackToLogin={onBackToLogin} />;
}

