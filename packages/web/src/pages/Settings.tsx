import { useState, useEffect, useCallback } from "react";

import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { AppearanceSettings, SettingsLayout } from "@guardian/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/api/auth";
import { adminApi } from "@/api/admin";
import { toast } from "sonner";
import { Globe, Server, Save, Loader2, RefreshCw } from "lucide-react";

type SectionID = "appearance" | "server";

const Icons = {
    Appearance: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-3M9.707 3.293l-3.414 3.414A2 2 0 006 8.121V11h3a2 2 0 002-2V5a2 2 0 00-2-2 1.99 1.99 0 00-1.293.293z" />
        </svg>
    ),
    Server: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
    ),
};

export default function Settings() {
    const { theme, setTheme, accentColor, setAccentColor, themeClasses, accentClasses } = useTheme();
    const isAdmin = authApi.isAdmin();
    const [activeSection, setActiveSection] = useState<SectionID>("appearance");
    const [serverSettings, setServerSettings] = useState<Record<string, string>>({});
    const [wsDefault, setWsDefault] = useState("0");
    const [saving, setSaving] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(false);

    const navItems = [
        { id: "appearance", label: "Appearance", icon: <Icons.Appearance /> },
    ];
    if (isAdmin) {
        navItems.push({ id: "server", label: "Server", icon: <Icons.Server /> });
    }

    const loadSettings = useCallback(async () => {
        setLoadingSettings(true);
        try {
            const data = await adminApi.getSettings();
            setServerSettings(data);
            setWsDefault(data.max_ws_per_ip_default || "0");
        } catch {
            toast.error("Failed to load server settings");
        } finally {
            setLoadingSettings(false);
        }
    }, []);

    useEffect(() => {
        if (activeSection === "server" && isAdmin) {
            loadSettings();
        }
    }, [activeSection, isAdmin, loadSettings]);

    const handleSaveWsDefault = async () => {
        setSaving(true);
        try {
            await adminApi.updateSetting("max_ws_per_ip_default", wsDefault);
            setServerSettings((prev) => ({ ...prev, max_ws_per_ip_default: wsDefault }));
            toast.success("WebSocket limit updated");
        } catch {
            toast.error("Failed to save setting");
        } finally {
            setSaving(false);
        }
    };

    return (
        <SettingsLayout
            title="Settings"
            subtitle="Guardian Panel"
            navItems={navItems}
            activeSection={activeSection}
            onSectionChange={(id) => setActiveSection(id as SectionID)}
            theme={theme}
            accentColor={accentColor}
        >
            <AnimatePresence mode="wait">
                {activeSection === "appearance" && (
                    <motion.div
                        key="appearance"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="space-y-12 md:space-y-14"
                    >
                        <AppearanceSettings
                            theme={theme}
                            accentColor={accentColor}
                            onThemeChange={setTheme}
                            onAccentColorChange={setAccentColor}
                        />
                    </motion.div>
                )}

                {activeSection === "server" && isAdmin && (
                    <motion.div
                        key="server"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="space-y-6"
                    >
                        {/* Server Settings */}
                        <div className={`${themeClasses.sectionBg} rounded-xl p-5 space-y-5`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Server className={`w-4 h-4 ${accentClasses.textClass}`} />
                                    <div>
                                        <h3 className={`text-sm font-medium ${themeClasses.text}`}>Server Settings</h3>
                                        <p className={`text-xs ${themeClasses.textTertiary}`}>
                                            Global rate limits and configuration
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={loadSettings}
                                    disabled={loadingSettings}
                                    className={`p-1.5 rounded-md ${themeClasses.hoverBg} ${themeClasses.textTertiary} hover:${themeClasses.textSecondary} transition-colors`}
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSettings ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <div className="flex items-end gap-3">
                                <div className="space-y-1.5 flex-1 max-w-xs">
                                    <Label className={`${themeClasses.textTertiary} text-xs`}>Max WebSocket connections per IP</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min="0"
                                            value={wsDefault}
                                            onChange={(e) => setWsDefault(e.target.value)}
                                            className={`h-9 w-24 ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} text-sm text-center focus:${accentClasses.focusBorderClass}/50 rounded-lg`}
                                        />
                                        <Button
                                            onClick={handleSaveWsDefault}
                                            disabled={saving}
                                            size="sm"
                                            className={`h-9 ${accentClasses.bgClass} hover:${accentClasses.bgHoverClass} text-black font-semibold rounded-lg px-4`}
                                        >
                                            {saving ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <><Save className="w-3.5 h-3.5 mr-1.5" /> Save</>
                                            )}
                                        </Button>
                                    </div>
                                    <p className={`${themeClasses.textTertiary} text-[11px]`}>
                                        0 = unlimited. Per-user overrides in Users page.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </SettingsLayout>
    );
}


