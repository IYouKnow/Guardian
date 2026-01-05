import { useState } from "react";
import { SettingsLayout } from "../../../shared/ui/SettingsLayout";
import { AppearanceSettings } from "../../../shared/ui/AppearanceSettings";
import { SecuritySettings } from "../../../shared/ui/SecuritySettings";
import { getThemeClasses } from "../utils/theme";
import { getAccentColorClasses } from "../utils/accentColors";
import type { Theme, AccentColor } from "../types";

interface SettingsProps {
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    accentColor: AccentColor;
    onAccentColorChange: (color: AccentColor) => void;
    clipboardClearSeconds: number;
    onClipboardClearSecondsChange: (seconds: number) => void;
    revealCensorSeconds: number;
    onRevealCensorSecondsChange: (seconds: number) => void;
    onBack: () => void;
    onLogout: () => void;
}

export default function Settings({
    theme,
    onThemeChange,
    accentColor,
    onAccentColorChange,
    clipboardClearSeconds,
    onClipboardClearSecondsChange,
    revealCensorSeconds,
    onRevealCensorSecondsChange,
    onBack,
    onLogout,
}: SettingsProps) {
    const [activeSection, setActiveSection] = useState("appearance");
    const themeClasses = getThemeClasses(theme);
    const accentClasses = getAccentColorClasses(accentColor);

    const navItems = [
        {
            id: "appearance",
            label: "Appearance",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
            ),
        },
        {
            id: "security",
            label: "Security",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            )
        }
    ];

    return (
        <div className="h-full w-full relative z-50">
            <SettingsLayout
                title="Settings"
                subtitle="Extension"
                navItems={navItems}
                activeSection={activeSection}
                onSectionChange={(id) => {
                    if (id === 'logout') {
                        onLogout();
                    } else {
                        setActiveSection(id);
                    }
                }}
                theme={theme}
                accentColor={accentColor}
                onBack={onBack}
            >
                {activeSection === "appearance" && (
                    <AppearanceSettings
                        theme={theme}
                        accentColor={accentColor}
                        onThemeChange={onThemeChange}
                        onAccentColorChange={onAccentColorChange}
                        showTitle={true}
                    />
                )}

                {activeSection === "security" && (
                    <SecuritySettings
                        theme={theme}
                        accentColor={accentColor}
                        clipboardClearSeconds={clipboardClearSeconds}
                        onClipboardClearSecondsChange={onClipboardClearSecondsChange}
                        revealCensorSeconds={revealCensorSeconds}
                        onRevealCensorSecondsChange={onRevealCensorSecondsChange}
                        showTitle={true}
                    />
                )}
            </SettingsLayout>
        </div>
    );
}
