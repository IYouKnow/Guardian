export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  order?: number;
  icon?: string;
}

export interface CustomField {
  name: string;
  value: string;
  type: string;
}

export interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  website: string;
  password: string;
  favicon?: string;
  folderId?: string;
  order?: number;
  favorite?: boolean;
  passwordStrength?: "weak" | "medium" | "strong" | "very-strong";
  lastModified?: string;
  notes?: string;
  tags?: string[];
  breached?: boolean;
  customFields?: CustomField[];
}

export type { Theme, AccentColor } from "@guardian/shared";
