import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Theme, AccentColor } from '../types';
import { getThemeClasses, getAccentColorClasses } from '../utils/theme';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    accentColor: AccentColor;
    setAccentColor: (color: AccentColor) => void;
    themeClasses: ReturnType<typeof getThemeClasses>;
    accentClasses: ReturnType<typeof getAccentColorClasses>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        return (localStorage.getItem('guardian_theme') as Theme) || 'dark';
    });
    const [accentColor, setAccentColor] = useState<AccentColor>(() => {
        return (localStorage.getItem('guardian_accent') as AccentColor) || 'yellow';
    });

    useEffect(() => {
        localStorage.setItem('guardian_theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('guardian_accent', accentColor);
    }, [accentColor]);

    const themeClasses = getThemeClasses(theme);
    const accentClasses = getAccentColorClasses(accentColor, theme);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor, themeClasses, accentClasses }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
