import { useState, FormEvent, useEffect, useRef, type ChangeEvent } from "react";
import { PasswordEntry, Folder, CustomField } from "../types";
import { normalizeIcon } from "@guardian/shared";

interface AddPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPassword: (password: PasswordEntry) => Promise<void>;
  onUpdatePassword?: (id: string, updates: Partial<PasswordEntry>) => Promise<void>;
  folders: Folder[];
  defaultFolderId?: string | null;
  existingPassword?: PasswordEntry | null;
  customFieldTemplates?: { name: string; type: string }[];
}

function getChildFolders(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((f) => f.parentId === parentId);
}

export default function AddPasswordModal({ isOpen, onClose, onAddPassword, onUpdatePassword, folders, defaultFolderId, existingPassword, customFieldTemplates }: AddPasswordModalProps) {
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");
  const [favicon, setFavicon] = useState<string | undefined>(undefined);
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [page, setPage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNormalizingIcon, setIsNormalizingIcon] = useState(false);
  const [error, setError] = useState("");
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, string>>({});
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPage(0);
      if (existingPassword) {
        setTitle(existingPassword.title);
        setUsername(existingPassword.username);
        setWebsite(existingPassword.website);
        setPassword(existingPassword.password);
        setFavicon(existingPassword.favicon);
        setFolderId(existingPassword.folderId);
        setNotes(existingPassword.notes || "");
        const values: Record<string, string> = {};
        for (const f of (existingPassword.customFields || [])) {
          values[f.name] = f.value;
        }
        setTemplateFieldValues(values);
      } else {
        setTitle("");
        setUsername("");
        setWebsite("");
        setPassword("");
        setFavicon(undefined);
        setFolderId(defaultFolderId ?? undefined);
        setNotes("");
        setTemplateFieldValues({});
      }
      setError("");
    }
  }, [isOpen, defaultFolderId, existingPassword]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (folderPickerRef.current && !folderPickerRef.current.contains(e.target as Node)) {
        setShowFolderPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const buildCustomFields = (): CustomField[] => {
    const result: CustomField[] = [];
    if (customFieldTemplates) {
      for (const tmpl of customFieldTemplates) {
        if (tmpl.name.trim()) {
          result.push({ name: tmpl.name.trim(), value: templateFieldValues[tmpl.name] || "", type: tmpl.type });
        }
      }
    }
    return result;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (page === 0) {
      if (!title.trim()) {
        setError("Title is required");
        return;
      }
      if (!password.trim()) {
        setError("Password is required");
        return;
      }
      setPage(1);
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingPassword) {
        await onUpdatePassword!(existingPassword.id, {
          title: title.trim(),
          username: username.trim(),
          website: website.trim(),
          password,
          favicon,
          folderId,
          notes: notes.trim() || undefined,
          customFields: buildCustomFields(),
        });
      } else {
        const newPassword: PasswordEntry = {
          id: crypto.randomUUID(),
          title: title.trim(),
          username: username.trim(),
          website: website.trim(),
          password: password,
          favicon,
          folderId,
          favorite: false,
          lastModified: new Date().toISOString(),
          notes: notes.trim() || undefined,
          breached: false,
          customFields: buildCustomFields(),
        };

        await onAddPassword(newPassword);
      }
      onClose();
    } catch (err) {
      console.error("Error saving password:", err);
      setError("Failed to save password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIconPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for the icon.");
      return;
    }

    setError("");
    setIsNormalizingIcon(true);
    try {
      const normalized = await normalizeIcon(file);
      if (!normalized) {
        throw new Error("Couldn't prepare that icon. Try a different image.");
      }
      setFavicon(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare the icon.");
    } finally {
      setIsNormalizingIcon(false);
    }
  };

  const getFolderPath = (id: string | undefined): string => {
    if (!id) return "No folder";
    const folder = folders.find((f) => f.id === id);
    if (!folder) return "No folder";
    const parts: string[] = [folder.name];
    let parent = folder.parentId;
    while (parent) {
      const pf = folders.find((f) => f.id === parent);
      if (pf) {
        parts.unshift(pf.name);
        parent = pf.parentId;
      } else {
        break;
      }
    }
    return parts.join(" / ");
  };

  const renderFolderOption = (f: Folder, depth: number) => (
    <div key={f.id}>
      <button
        type="button"
        onClick={() => { setFolderId(f.id); setShowFolderPicker(false); }}
        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 rounded transition-colors flex items-center gap-2 ${folderId === f.id ? 'text-yellow-400' : 'text-gray-300'}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        {f.name}
      </button>
      {getChildFolders(folders, f.id).map((child) => renderFolderOption(child, depth + 1))}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{existingPassword ? "Edit Password" : "Add New Password"}</h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-gray-400">Icon</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleIconPick}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting || isNormalizingIcon}
                  className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                >
                  {favicon ? "Replace" : "Add icon"}
                </button>
                {favicon && (
                  <button
                    type="button"
                    onClick={() => setFavicon(undefined)}
                    disabled={isSubmitting || isNormalizingIcon}
                    className="px-3 py-1.5 border border-[#2a2a2a] text-gray-300 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-yellow-400/10 border border-[#2a2a2a] flex items-center justify-center text-sm font-bold text-yellow-400">
                  {favicon ? (
                    <img src={favicon} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (title.trim() || "A").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{title.trim() || "Saved app"}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {isNormalizingIcon ? "Preparing icon..." : website.trim() || "Custom app icon"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., GitHub"
              required
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Username/Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="example.com"
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
            />
          </div>
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-2">Folder</label>
            <button
              type="button"
              onClick={() => setShowFolderPicker(!showFolderPicker)}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white text-left flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50"
            >
              <span className={folderId ? "text-white" : "text-gray-500"}>
                {getFolderPath(folderId)}
              </span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${showFolderPicker ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showFolderPicker && (
              <div
                ref={folderPickerRef}
                className="absolute z-10 left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl max-h-48 overflow-y-auto py-1"
              >
                <button
                  type="button"
                  onClick={() => { setFolderId(undefined); setShowFolderPicker(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 rounded transition-colors ${!folderId ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  No folder
                </button>
                {getChildFolders(folders, null).map((f) => renderFolderOption(f, 0))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all resize-none"
            />
          </div>

          {page === 0 && customFieldTemplates && customFieldTemplates.length > 0 && (
            <div className="flex justify-end pt-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 opacity-50">
                {customFieldTemplates.length} custom field{customFieldTemplates.length !== 1 ? 's' : ''} on next page
              </span>
            </div>
          )}

          {page === 1 && customFieldTemplates && customFieldTemplates.length > 0 && (
            <div>
              <label className="block text-sm text-gray-400 mb-3">Custom Fields</label>
              <div className="space-y-3">
                {customFieldTemplates.map((tmpl, i) => (
                  <div key={i}>
                    <label className="block text-xs text-gray-500 mb-1">{tmpl.name}</label>
                    <input
                      type="text"
                      value={templateFieldValues[tmpl.name] || ""}
                      onChange={(e) => setTemplateFieldValues(prev => ({ ...prev, [tmpl.name]: e.target.value }))}
                      placeholder={`Enter ${tmpl.name}`}
                      className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {page === 0 && (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                {customFieldTemplates && customFieldTemplates.length > 0 ? "Next →" : (existingPassword ? "Save Changes" : "Add Password")}
              </button>
            </div>
          )}

          {page === 1 && (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPage(0)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  existingPassword ? "Save Changes" : "Add Password"
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
