import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import type { PasswordEntry } from "../types";
import { generatePassword } from "../../../shared/crypto/generator";

interface EditPasswordModalProps {
    isOpen: boolean;
    password: PasswordEntry;
    onClose: () => void;
    onSave: (updated: PasswordEntry) => Promise<void>;
}

export default function EditPasswordModal({
    isOpen,
    password: original,
    onClose,
    onSave,
}: EditPasswordModalProps) {
    const [title, setTitle] = useState("");
    const [username, setUsername] = useState("");
    const [website, setWebsite] = useState("");
    const [password, setPassword] = useState("");
    const [category, setCategory] = useState("Development");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Pre-fill when modal opens
    useEffect(() => {
        if (isOpen && original) {
            setTitle(original.title || "");
            setUsername(original.username || "");
            setWebsite(original.website || "");
            setPassword(original.password || "");
            setCategory(original.category || "Development");
            setNotes(original.notes || "");
            setError("");
        }
    }, [isOpen, original]);

    const handleGeneratePassword = () => {
        setPassword(generatePassword({ length: 20 }));
    };

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
            const updated: PasswordEntry = {
                ...original,
                title: title.trim(),
                username: username.trim(),
                website: website.trim(),
                password: password,
                category: category || undefined,
                notes: notes.trim() || undefined,
                lastModified: new Date().toISOString(),
            };

            await onSave(updated);
            onClose();
        } catch (err) {
            console.error("Error editing password:", err);
            setError("Failed to save changes. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Edit Password</h3>
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
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                                className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                            />
                            <button
                                type="button"
                                onClick={handleGeneratePassword}
                                className="px-3 py-2 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 rounded-lg text-xs font-semibold transition-all border border-yellow-400/20 whitespace-nowrap"
                                title="Generate random password"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
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
                        <label className="block text-sm text-gray-400 mb-2">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional notes..."
                            rows={3}
                            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all resize-none"
                        />
                    </div>
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
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
