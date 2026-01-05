import React from "react";
import { motion } from "framer-motion";
import type { Theme, AccentColor } from "../themes/index";
import { getThemeClasses, getAccentColorClasses } from "../themes/index";

interface SecuritySettingsProps {
    theme: Theme;
    accentColor: AccentColor;
    clipboardClearSeconds: number;
    onClipboardClearSecondsChange: (seconds: number) => void;
    revealCensorSeconds: number;
    onRevealCensorSecondsChange: (seconds: number) => void;
    showTitle?: boolean;
}

interface SecuritySettingProps {
    label: string;
    description: string;
    value: number;
    onChange: (val: number) => void;
    unit?: string;
    themeClasses: ReturnType<typeof getThemeClasses>;
    accentClasses: ReturnType<typeof getAccentColorClasses>;
    accentColor: AccentColor;
}

const SecuritySetting = ({
    label,
    description,
    value,
    onChange,
    unit = "seconds",
    themeClasses,
    accentClasses,
    accentColor
}: SecuritySettingProps) => {
    const isEnabled = value > 0;

    return (
        <div className={`p-4 rounded-xl border ${themeClasses.border} ${themeClasses.cardBg}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                    <span className={`text-sm font-medium ${themeClasses.text}`}>{label}</span>
                    <span className={`text-[10px] ${themeClasses.textSecondary}`}>{description}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isEnabled}
                        onChange={(e) => onChange(e.target.checked ? 10 : 0)}
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${isEnabled ? `bg-${accentColor}-500` : 'bg-gray-600'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-${accentColor}-400/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                </label>
            </div>

            {isEnabled && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pt-2 border-t border-gray-700/20"
                >
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min="1"
                            value={value}
                            onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 0))}
                            className={`w-20 ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-2 py-1 text-xs ${themeClasses.text} focus:outline-none focus:ring-1 ${accentClasses.focusRingClass}`}
                        />
                        <span className={`text-xs ${themeClasses.textSecondary}`}>{unit}</span>
                    </div>
                </motion.div>
            )}
            {!isEnabled && (
                <div className="pt-1">
                    <span className={`text-xs font-bold ${themeClasses.textSecondary} opacity-50 uppercase tracking-wider`}>Never</span>
                </div>
            )}
        </div>
    );
};

export const SecuritySettings = ({
    theme,
    accentColor,
    clipboardClearSeconds,
    onClipboardClearSecondsChange,
    revealCensorSeconds,
    onRevealCensorSecondsChange,
    showTitle = true,
}: SecuritySettingsProps) => {
    const themeClasses = getThemeClasses(theme);
    const accentClasses = getAccentColorClasses(accentColor);

    return (
        <div className="space-y-12 md:space-y-14 animate-in fade-in duration-300">
            {showTitle && (
                <header>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2 md:mb-3">Security</h2>
                    <p className={`text-xs md:text-sm ${themeClasses.textSecondary} max-w-md leading-relaxed`}>
                        Manage cryptographic and access control protocols.
                    </p>
                </header>
            )}

            <section>
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-6 md:mb-8 block ${themeClasses.textTertiary}`}>Auto-Lock Controls</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <SecuritySetting
                        label="Clear Clipboard"
                        description="Automatically clear copied passwords"
                        value={clipboardClearSeconds}
                        onChange={onClipboardClearSecondsChange}
                        themeClasses={themeClasses}
                        accentClasses={accentClasses}
                        accentColor={accentColor}
                    />

                    <SecuritySetting
                        label="Hide Password"
                        description="Automatically hide revealed passwords"
                        value={revealCensorSeconds}
                        onChange={onRevealCensorSecondsChange}
                        themeClasses={themeClasses}
                        accentClasses={accentClasses}
                        accentColor={accentColor}
                    />
                </div>
            </section>
        </div>
    );
};
