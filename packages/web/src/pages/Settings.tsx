import { useState } from "react";

import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { AppearanceSettings, SettingsLayout } from "@guardian/shared";

const Icons = {
    Appearance: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-3M9.707 3.293l-3.414 3.414A2 2 0 006 8.121V11h3a2 2 0 002-2V5a2 2 0 00-2-2 1.99 1.99 0 00-1.293.293z" />
        </svg>
    ),
};

export default function Settings() {
    const { theme, setTheme, accentColor, setAccentColor } = useTheme();
    const [activeSection, setActiveSection] = useState<"appearance">("appearance");

    const navItems = [
        { id: "appearance", label: "Appearance", icon: <Icons.Appearance /> },
    ];

    return (
        <SettingsLayout
            title="Settings"
            subtitle="Guardian Panel"
            navItems={navItems}
            activeSection={activeSection}
            onSectionChange={(id) => setActiveSection(id as "appearance")}
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
            </AnimatePresence>
        </SettingsLayout>
    );
}


