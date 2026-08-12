import { PasswordEntry, CustomField, Folder } from "../types";
import { Kdbx, Credentials, ProtectedValue } from "kdbxweb";
import { normalizeIcon } from "@guardian/core";

interface ImportResult {
  entries: PasswordEntry[];
  folders: Folder[];
  rootFolderId: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

const STANDARD_CSV_HEADERS = new Set(["title", "username", "password", "url", "notes"]);

function getFieldValue(fields: Map<string, any>, key: string): string {
  const val = fields.get(key);
  if (!val) return "";
  if (val instanceof ProtectedValue) return val.getText();
  return String(val);
}

export async function parseKeePassKdbx(data: ArrayBuffer, password: string, keyFileData?: Uint8Array): Promise<ImportResult> {
  const pw = ProtectedValue.fromString(password);
  const credentials = keyFileData
    ? new Credentials(pw, keyFileData)
    : new Credentials(pw);
  const kdbx = await Kdbx.load(data, credentials);

  const iconMap = new Map<string, string>();
  if (kdbx.meta.customIcons) {
    for (const [uuid, iconData] of kdbx.meta.customIcons) {
      if (iconData?.data) {
        try {
          const normalized = await normalizeIcon({
            bytes: iconData.data,
            mimeType: "image/png",
          });
          if (normalized) {
            iconMap.set(uuid, normalized);
          }
        } catch {
          // skip icons that fail to normalize
        }
      }
    }
  }

  const keePassFolderId = crypto.randomUUID();
  const folderMap = new Map<string, { id: string; name: string; parentId: string | null; order: number; icon?: string }>();
  const groupToId = new Map<any, string>();
  folderMap.set(keePassFolderId, { id: keePassFolderId, name: "KeePass", parentId: null, order: 0 });

  const order = { value: 1 };

  // Flatten groups with icon support
  function flattenGroupWithIcon(
    group: any,
    parentId: string | null,
  ): string | null {
    const name = group.name?.trim() || "Unnamed";
    const id = crypto.randomUUID();
    const icon = group.customIcon ? iconMap.get(group.customIcon.toString()) : undefined;
    folderMap.set(id, { id, name, parentId, order: order.value++, icon });
    groupToId.set(group, id);

    if (group.groups) {
      for (const child of group.groups) {
        flattenGroupWithIcon(child, id);
      }
    }
    return id;
  }

  if (kdbx.groups) {
    for (const group of kdbx.groups) {
      const isRoot = group.name === undefined || group.parentGroup === null;
      if (isRoot) {
        if (group.groups) {
          for (const child of group.groups) {
            flattenGroupWithIcon(child, keePassFolderId);
          }
        }
      } else {
        flattenGroupWithIcon(group, keePassFolderId);
      }
    }
  }

  const entries: PasswordEntry[] = [];

  if (kdbx.groups) {
    for (const group of kdbx.groups) {
      const isRoot = group.name === undefined || group.parentGroup === null;
      if (isRoot) {
        if (group.entries) {
          for (const entry of group.entries) {
            if (entry.fields) {
              entries.push({
                id: crypto.randomUUID(),
                title: getFieldValue(entry.fields, "Title") || "Imported Entry",
                username: getFieldValue(entry.fields, "UserName"),
                password: getFieldValue(entry.fields, "Password"),
                website: getFieldValue(entry.fields, "URL"),
                notes: getFieldValue(entry.fields, "Notes") || undefined,
                favicon: entry.customIcon ? iconMap.get(entry.customIcon.toString()) : undefined,
                folderId: keePassFolderId,
                lastModified: new Date().toISOString(),
              });
            }
          }
        }
        if (group.groups) {
          for (const child of group.groups) {
            entries.push(...collectKdbxEntriesWithIcon(child, groupToId, iconMap));
          }
        }
      } else {
        entries.push(...collectKdbxEntriesWithIcon(group, groupToId, iconMap));
      }
    }
  }

  const folders: Folder[] = Array.from(folderMap.values());

  return { entries, folders, rootFolderId: keePassFolderId };
}

function collectKdbxEntriesWithIcon(
  group: any,
  groupToId: Map<any, string>,
  iconMap: Map<string, string>,
): PasswordEntry[] {
  const entries: PasswordEntry[] = [];
  const folderId = groupToId.get(group);

  if (group.entries) {
    for (const entry of group.entries) {
      if (entry.fields) {
        const title = getFieldValue(entry.fields, "Title") || "Imported Entry";
        const username = getFieldValue(entry.fields, "UserName");
        const password = getFieldValue(entry.fields, "Password");
        const url = getFieldValue(entry.fields, "URL");
        const notes = getFieldValue(entry.fields, "Notes");
        const customFields: CustomField[] = [];
        if (entry.customData) {
          for (const [name, val] of entry.customData.entries()) {
            if (val) {
              customFields.push({ name, value: String(val), type: "text" });
            }
          }
        }

        entries.push({
          id: crypto.randomUUID(),
          title,
          username,
          website: url,
          password,
          notes: notes || undefined,
          favicon: entry.customIcon ? iconMap.get(entry.customIcon.toString()) : undefined,
          folderId,
          lastModified: new Date().toISOString(),
          customFields: customFields.length > 0 ? customFields : undefined,
        });
      }
    }
  }

  if (group.groups) {
    for (const child of group.groups) {
      entries.push(...collectKdbxEntriesWithIcon(child, groupToId, iconMap));
    }
  }

  return entries;
}

export function parseKeePassCsv(text: string): ImportResult {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV file must have a header row and at least one entry");

  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const standardIndices: Record<string, number> = {};
  const customIndices: { name: string; index: number }[] = [];

  for (let i = 0; i < headers.length; i++) {
    const lower = headers[i].toLowerCase().replace(/\s+/g, "");
    if (STANDARD_CSV_HEADERS.has(lower)) {
      standardIndices[lower] = i;
    } else {
      customIndices.push({ name: headers[i], index: i });
    }
  }

  const entries: PasswordEntry[] = [];
  const keePassFolderId = crypto.randomUUID();
  const folders: Folder[] = [{ id: keePassFolderId, name: "KeePass", parentId: null, order: 0 }];

  for (let r = 1; r < lines.length; r++) {
    const fields = parseCsvLine(lines[r]);
    if (fields.every(f => !f.trim())) continue;

    const customFields: CustomField[] = [];
    for (const ci of customIndices) {
      const val = (fields[ci.index] || "").trim();
      if (val) {
        customFields.push({ name: ci.name, value: val, type: "text" });
      }
    }

    entries.push({
      id: crypto.randomUUID(),
      title: (fields[standardIndices["title"]] || "").trim() || "Imported Entry",
      username: (fields[standardIndices["username"]] || "").trim(),
      website: (fields[standardIndices["url"]] || "").trim(),
      password: (fields[standardIndices["password"]] || "").trim(),
      notes: (fields[standardIndices["notes"]] || "").trim() || undefined,
      folderId: keePassFolderId,
      lastModified: new Date().toISOString(),
      customFields: customFields.length > 0 ? customFields : undefined,
    });
  }

  return { entries, folders, rootFolderId: keePassFolderId };
}
