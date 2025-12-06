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

export type Theme = "dark" | "slate" | "light" | "editor" | "violet";

export type AccentColor = "yellow" | "blue" | "green" | "purple" | "pink" | "orange" | "cyan" | "red";

