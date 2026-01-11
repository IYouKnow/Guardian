import { Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface TitleBarProps {
    theme: Theme;
    accentColor: AccentColor;
}

const appWindow = getCurrentWindow();

export default function TitleBar({ theme, accentColor }: TitleBarProps) {
    const getThemeClasses = () => {
        switch (theme) {
            case "light":
                return {
                    bg: "bg-white/40",
                    text: "text-slate-900",
                    border: "border-slate-200",
                    hover: "hover:bg-slate-200/50"
                };
            case "slate":
                return {
                    bg: "bg-slate-950/40",
                    text: "text-slate-100",
                    border: "border-slate-800",
                    hover: "hover:bg-slate-800/50"
                };
            case "editor":
                return {
                    bg: "bg-[#0d0d0d]/40",
                    text: "text-[#d4d4d4]",
                    border: "border-[#333333]",
                    hover: "hover:bg-[#333333]/50"
                };
            case "violet":
                return {
                    bg: "bg-[#120a1f]/40",
                    text: "text-[#f8f8f2]",
                    border: "border-[#4a3a6b]",
                    hover: "hover:bg-[#4a3a6b]/50"
                };
            default: // dark
                return {
                    bg: "bg-black/40",
                    text: "text-white",
                    border: "border-zinc-800/50",
                    hover: "hover:bg-zinc-800/50"
                };
        }
    };

    const themeClasses = getThemeClasses();
    const accentClasses = getAccentColorClasses(accentColor, theme);

    return (
        <div
            data-tauri-drag-region
            onDoubleClick={() => {
                appWindow.toggleMaximize().catch(err => console.error("Toggle maximize error:", err));
            }}
            className={`h-8 flex items-center justify-between ${themeClasses.bg} backdrop-blur-xl border-b ${themeClasses.border} select-none relative z-[100] cursor-default`}
        >
            <div className="flex items-center px-4 gap-2 pointer-events-none">
                <div className={`w-3 h-3 rounded-full ${accentClasses.bgClass} shadow-sm`} />
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${themeClasses.text} opacity-40`}>
                    Guardian
                </span>
            </div>

            <div className="flex h-full relative z-[102]">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log("Minimizing...");
                        appWindow.minimize().catch(err => console.error("Minimize error:", err));
                    }}
                    className={`w-10 h-full flex items-center justify-center transition-colors ${themeClasses.hover} ${themeClasses.text} opacity-60 hover:opacity-100`}
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                    </svg>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log("Maximizing...");
                        appWindow.toggleMaximize().catch(err => console.error("Maximize error:", err));
                    }}
                    className={`w-10 h-full flex items-center justify-center transition-colors ${themeClasses.hover} ${themeClasses.text} opacity-60 hover:opacity-100`}
                >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2.5} />
                    </svg>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log("Closing...");
                        appWindow.close().catch(err => console.error("Close error:", err));
                    }}
                    className="w-10 h-full flex items-center justify-center transition-colors hover:bg-red-500/80 hover:text-white transition-colors duration-200 group"
                >
                    <svg className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
