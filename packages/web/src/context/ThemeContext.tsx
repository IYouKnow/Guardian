import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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

    // Track whether initial fetch has completed to avoid saving stale defaults
    const initialFetchDone = useRef(false);

    // Use refs to always access current values in the save function
    const themeRef = useRef(theme);
    const accentColorRef = useRef(accentColor);
    useEffect(() => { themeRef.current = theme; }, [theme]);
    useEffect(() => { accentColorRef.current = accentColor; }, [accentColor]);

    // Stable save function that always reads current values from refs
    const saveToServer = useCallback(async () => {
        const token = authApi.getToken();
        if (!token) return;

        const payload = {
            theme: themeRef.current,
            accentColor: accentColorRef.current
        };

        try {
            // Use apiClient or relative path. apiClient handles baseURL and headers.
            // But context requires cyclical dep if we import apiClient? 
            // ThemeContext -> api/auth -> api/client. No cycle.
            // Using fetch with relative path is safer if we want to avoid extra deps here, 
            // but let's be consistent. Actually, let's use relative fetch to avoid importing apiClient if not needed,
            // OR use apiClient which is cleaner. Let's use fetch with relative path to be safe and simple.
            // The go server serves the app, so /api/preferences is correct.

            // Note: In Vite dev mode, we need proxy. In prod, relative is fine.
            // Vite proxy handles /api -> localhost:8080. 
            // So '/api/preferences' works in BOTH dev and prod.

            await fetch('/api/preferences', {
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
    }, []);

    // Initial Fetch from Server
    useEffect(() => {
        const fetchPreferences = async () => {
            const token = authApi.getToken();
            if (!token) {
                initialFetchDone.current = true;
                return;
            }

            try {
                const res = await fetch('/api/preferences', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.theme) setTheme(data.theme);
                    if (data.accentColor) setAccentColor(data.accentColor);
                }
            } catch (e) {
                console.error("Failed to fetch preferences", e);
            } finally {
                initialFetchDone.current = true;
            }
        };
        fetchPreferences();
    }, []);

    // Debounced sync to LocalStorage & Server whenever theme or accent changes
    useEffect(() => {
        localStorage.setItem('guardian_theme', theme);
        localStorage.setItem('guardian_accent', accentColor);

        // Don't save back to server during initial fetch (avoids overwriting with defaults)
        if (!initialFetchDone.current) return;

        const handler = setTimeout(() => {
            saveToServer();
        }, 300);

        return () => clearTimeout(handler);
    }, [theme, accentColor, saveToServer]);

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
