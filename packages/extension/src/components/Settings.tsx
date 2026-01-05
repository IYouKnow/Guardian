import { useState } from "react";
import { SettingsLayout } from "../../../shared/ui/SettingsLayout";
import { AppearanceSettings } from "../../../shared/ui/AppearanceSettings";
import type { Theme, AccentColor } from "../types";

interface SettingsProps {
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    accentColor: AccentColor;
    onAccentColorChange: (color: AccentColor) => void;
    onBack: () => void;
    onLogout: () => void;
}

export default function Settings({
    theme,
    onThemeChange,
    accentColor,
    onAccentColorChange,
    onBack,
    onLogout,
}: SettingsProps) {
    const [activeSection, setActiveSection] = useState("appearance");

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
            id: "logout",
            label: "Lock Vault",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
            </SettingsLayout>
        </div>
    );
}
