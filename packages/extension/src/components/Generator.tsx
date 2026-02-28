import { useState, useEffect } from "react";
import { Copy, RefreshCcw, Check, Key } from "lucide-react";
import type { Theme, AccentColor } from "../types";
import { getThemeClasses } from "../utils/theme";
import { getAccentColorClasses } from "../utils/accentColors";
import { generatePassword, evaluatePasswordStrength, type GeneratorOptions } from "../../../shared/crypto/generator";
import { motion } from "framer-motion";

interface GeneratorProps {
    theme: Theme;
    accentColor: AccentColor;
}

export default function Generator({ theme, accentColor }: GeneratorProps) {
    const themeClasses = getThemeClasses(theme);
    const accentClasses = getAccentColorClasses(accentColor, theme);

    const [options, setOptions] = useState<GeneratorOptions>({
        length: 20,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        excludeAmbiguous: false,
    });

    const [password, setPassword] = useState("");
    const [copied, setCopied] = useState(false);

    const strength = password ? evaluatePasswordStrength(password) : null;
    const strengthScore = strength === "weak" ? 1 : strength === "medium" ? 2 : strength === "strong" ? 3 : 4;

    const regenerate = () => {
        try {
            setPassword(generatePassword(options));
            setCopied(false);
        } catch {
            setPassword("");
        }
    };

    useEffect(() => {
        regenerate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options]);

    const handleCopy = () => {
        if (!password) return;
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`flex flex-col h-full overflow-y-auto custom-scrollbar ${themeClasses.bg} ${themeClasses.text} font-sans p-3 sm:p-4 gap-3 selection:bg-current/10`}>
            {/* Main Outer Container styling inherited from Desktop App */}
            <motion.div
                layout
                className={`flex flex-col flex-1 shrink-0 group ${themeClasses.card} rounded-2xl border ${themeClasses.border} transition-all duration-300 shadow-xl`}
            >
                <div className="p-4 w-full flex flex-col">
                    {/* Header with desktop-style Icon */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br ${accentClasses.lightClass} border border-white/5 flex items-center justify-center ${accentClasses.textClass} shadow-inner`}>
                                <Key size={16} strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-bold ${themeClasses.text} text-base truncate`}>
                                    Generator
                                </h3>
                                <p className={`text-[9px] font-bold uppercase tracking-widest ${themeClasses.textMuted} opacity-60`}>
                                    Password Tools
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={regenerate}
                            className={`p-2.5 shrink-0 ${themeClasses.textMuted} hover:${accentClasses.textClass} hover:${accentClasses.lightClass} rounded-xl transition-all`}
                            title="Regenerate"
                        >
                            <RefreshCcw size={18} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Result Output - Desktop .item styling */}
                    <div className="space-y-4 mb-4">
                        <div className={`group/item flex flex-col p-3 rounded-xl ${themeClasses.item} border border-white/[0.02] transition-colors relative`}>
                            <p className={`text-[9px] font-bold uppercase tracking-wider ${themeClasses.textMuted} mb-1.5`}>Generated Output</p>
                            <div className="flex items-center justify-between gap-3">
                                <p className={`text-lg font-mono tracking-wider break-all ${password ? themeClasses.text : themeClasses.textMuted + ' opacity-50'}`}>
                                    {password || "••••••••••••••••"}
                                </p>
                                <button
                                    onClick={handleCopy}
                                    className={`p-2 shrink-0 rounded-lg transition-all ${copied ? accentClasses.bgClass + ' ' + accentClasses.onContrastClass : themeClasses.textMuted + ' hover:text-white bg-white/[0.02] hover:bg-white/[0.05]'}`}
                                    title="Copy"
                                >
                                    {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2} />}
                                </button>
                            </div>
                        </div>

                        {/* Security Indicator */}
                        <div className="flex items-center justify-between px-1">
                            <span className={`text-[0.55rem] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
                                Security Level {strength ? `(${strength.replace("-", " ")})` : ""}
                            </span>
                            <div className="flex gap-1.5">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className={`h-1.5 w-8 rounded-full ${i <= (password ? strengthScore : 0) ? accentClasses.bgClass : themeClasses.border} transition-colors duration-500`} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Configuration Options */}
                    <div className="flex-1 space-y-3">
                        {/* Length Slider - .item styling */}
                        <div className={`group/item flex flex-col p-3 rounded-xl ${themeClasses.item} border border-white/[0.02] transition-colors gap-3`}>
                            <div className="flex items-center justify-between">
                                <p className={`text-[9px] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>Password Length</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${accentClasses.lightClass} ${accentClasses.textClass}`}>
                                    {options.length}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={4}
                                max={64}
                                value={options.length}
                                onChange={(e) => setOptions((o) => ({ ...o, length: Number(e.target.value) }))}
                                className={`w-full h-1.5 rounded-full appearance-none cursor-pointer bg-black/20 dark:bg-white/5 relative z-10 transition-all focus:outline-none focus:ring-2 ${accentClasses.focusRingClass}`}
                                style={{ accentColor: "currentColor", color: "inherit" }}
                            />
                        </div>

                        {/* Toggles - Desktop pill styles */}
                        <div className="flex flex-col gap-2 pb-1">
                            {([
                                { key: "uppercase", label: "Uppercase (A-Z)" },
                                { key: "lowercase", label: "Lowercase (a-z)" },
                                { key: "numbers", label: "Numbers (0-9)" },
                                { key: "symbols", label: "Symbols (!@#)" },
                                { key: "excludeAmbiguous", label: "Exclude Ambiguous (0O1)" },
                            ] as const).map(({ key, label }) => {
                                const checked = !!options[key as keyof GeneratorOptions];
                                return (
                                    <label
                                        key={key}
                                        className={`group/toggle flex w-full items-center justify-between p-2.5 px-3 rounded-xl ${themeClasses.item} border border-white/[0.02] transition-colors cursor-pointer shrink-0`}
                                    >
                                        <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${checked ? themeClasses.text : themeClasses.textMuted} group-hover/toggle:${themeClasses.text}`}>
                                            {label}
                                        </span>
                                        <div className="relative flex items-center ml-3 shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className={`w-8 h-4 rounded-full transition-colors duration-300 ${checked ? accentClasses.bgClass : 'bg-black/10 dark:bg-white/10'}`} />
                                            <div className={`absolute left-0.5 w-3 h-3 rounded-full shadow-sm transition-transform duration-300 ${checked ? 'translate-x-[16px] bg-white ' + (accentClasses.onContrast === 'black' ? 'dark:bg-black' : '') : 'bg-white'}`} />
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
