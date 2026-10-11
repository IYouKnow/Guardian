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
  // Optional data URL of the site's favicon, captured on save-on-submit.
  favicon?: string;
}

export type Theme = "system" | "light" | "dark" | "slate" | "editor" | "violet";

export type AccentColor =
  | "yellow"
  | "orange"
  | "red"
  | "pink"
  | "purple"
  | "blue"
  | "cyan"
  | "green"
  | "black";


