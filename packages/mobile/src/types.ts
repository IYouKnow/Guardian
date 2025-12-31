export interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  website: string;
  password: string;
  category?: string;
  favorite?: boolean;
  passwordStrength?: "weak" | "medium" | "strong" | "very-strong";
  lastModified?: string;
  notes?: string;
  tags?: string[];
  breached?: boolean;
}
