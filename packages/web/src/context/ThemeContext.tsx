import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Theme, AccentColor } from '../types';
import { getThemeClasses, getAccentColorClasses } from '../utils/theme';
import { authApi } from '../api/auth';

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

    const saveToServer = async (prefs: any) => {
        const token = authApi.getToken();
        if (!token) return;

        try {
            // Need to merge current state with new prefs
            const payload = { theme, accentColor, ...prefs };

            await fetch('http://localhost:8080/api/preferences', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error("Failed to save preferences", e);
        }
    };


    // Initial Fetch from Server
    useEffect(() => {
        const fetchPreferences = async () => {
            const token = authApi.getToken();
            if (!token) return;

            try {
                // Using relative path assuming proxy or same origin
                // Note: User might be running dev server (port 5173) and backend (8080).
                // They likely have a proxy set up or CORS.
                const res = await fetch('http://localhost:8080/api/preferences', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.theme) setTheme(data.theme);
                    if (data.accentColor) setAccentColor(data.accentColor);
                }
            } catch (e) {
                console.error("Failed to fetch preferences", e);
            }
        };
        fetchPreferences();
    }, []);

    // Sync to LocalStorage & Server
    useEffect(() => {
        localStorage.setItem('guardian_theme', theme);
        saveToServer({ theme });
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('guardian_accent', accentColor);
        saveToServer({ accentColor });
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
