import { useState } from "react";
import type { FormEvent } from "react";
import type { PasswordEntry, Theme, AccentColor } from "../types";
import { generatePassword } from "../../../shared/crypto/generator";
import { getThemeClasses } from "../utils/theme";
import { getAccentColorClasses } from "../utils/accentColors";

interface AddPasswordPanelProps {
    onAddPassword: (password: PasswordEntry) => Promise<void>;
    onCancel: () => void;
    theme: Theme;
    accentColor: AccentColor;
}

export default function AddPasswordPanel({ onAddPassword, onCancel, theme, accentColor }: AddPasswordPanelProps) {
    const [title, setTitle] = useState("");
    const [username, setUsername] = useState("");
    const [website, setWebsite] = useState("");
    const [password, setPassword] = useState("");
    const [category, setCategory] = useState("Development");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const themeClasses = getThemeClasses(theme);
    const accentClasses = getAccentColorClasses(accentColor);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        if (!title.trim()) {
            setError("Title is required");
            return;
        }

        if (!password.trim()) {
            setError("Password is required");
            return;
        }

        setIsSubmitting(true);

        try {
            const newPassword: PasswordEntry = {
                id: crypto.randomUUID(),
                title: title.trim(),
                username: username.trim(),
                website: website.trim(),
                password: password,
                category: category || undefined,
                favorite: false,
                lastModified: new Date().toISOString(),
                notes: notes.trim() || undefined,
                breached: false,
            };

            await onAddPassword(newPassword);
        } catch (err) {
            console.error("Error adding password:", err);
            setError("Failed to save password. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`flex flex-col h-full overflow-hidden ${themeClasses.bg} ${themeClasses.text} font-sans`}>
            {/* Header */}
            <div className={`pt-4 pb-3 px-4 flex items-center gap-3 shrink-0 border-b ${themeClasses.border}`}>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center shadow-lg shrink-0`}>
                    <svg className={`w-4 h-4 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold tracking-tight truncate">Add Password</h1>
                    <p className={`text-[10px] ${themeClasses.textTertiary} mt-0.5 font-medium tracking-wide uppercase`}>
                        Create new entry
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${themeClasses.border} ${themeClasses.hoverBg} transition-all`}
                >
                    Cancel
                </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-hide">
                <form id="add-password-form" onSubmit={handleSubmit} className="space-y-3 max-w-sm">
                    {error && (
                        <div className={`p-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-medium`}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5`}>Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., GitHub"
                            required
                            className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 ${accentClasses.focusRingClass} transition-all`}
                        />
                    </div>

                    <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5`}>Username/Email</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="user@example.com"
                            className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 ${accentClasses.focusRingClass} transition-all`}
                        />
                    </div>

                    <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5`}>Website</label>
                        <input
                            type="text"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="example.com"
                            className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 ${accentClasses.focusRingClass} transition-all`}
                        />
                    </div>

                    <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5`}>Password *</label>
                        <div className="flex gap-2 relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                                className={`flex-1 ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl pl-3 pr-10 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 ${accentClasses.focusRingClass} transition-all`}
                            />
                            <button
                                type="button"
                                onClick={() => setPassword(generatePassword({ length: 20 }))}
                                className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${themeClasses.hoverBg} text-${accentColor}-400 hover:text-${accentColor}-500 transition-colors tooltip tooltip-left`}
                                title="Generate random password"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5`}>Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 ${accentClasses.focusRingClass} transition-all appearance-none`}
                        >
                            <option>Development</option>
                            <option>Email</option>
                            <option>Social</option>
                            <option>Entertainment</option>
                            <option>Finance</option>
                            <option>Shopping</option>
                            <option>Other</option>
                        </select>
                    </div>

                    <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5`}>Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional notes..."
                            rows={3}
                            className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 ${accentClasses.focusRingClass} transition-all resize-none font-mono`}
                        />
                    </div>
                </form>
            </div>

            {/* Footer */}
            <div className={`p-3 border-t ${themeClasses.border} bg-black/10 shrink-0`}>
                <button
                    form="add-password-form"
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-2 text-sm rounded-xl font-bold bg-${accentColor}-400 hover:bg-${accentColor}-500 text-black shadow-[0_0_15px_rgba(var(--${accentColor}-400-rgb),0.3)] transition-all flex items-center justify-center gap-2`}
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
                        "Save Password"
                    )}
                </button>
            </div>
        </div>
    );
}
