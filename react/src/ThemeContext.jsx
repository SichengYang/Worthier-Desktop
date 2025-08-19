import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light');
    const [actualTheme, setActualTheme] = useState('light'); // The resolved theme for styling

    useEffect(() => {
        // Load initial theme settings
        const loadInitialTheme = async () => {
            if (window.electronAPI?.getThemeSettings) {
                try {
                    const themeSettings = await window.electronAPI.getThemeSettings();
                    console.log('Loaded theme settings:', themeSettings);
                    setTheme(themeSettings.theme || 'system');
                    setActualTheme(themeSettings.resolvedTheme || 'light');
                } catch (error) {
                    console.error('Error loading theme settings:', error);
                    setTheme('system');
                    setActualTheme('light');
                }
            }
        };
        
        loadInitialTheme();

        // Listen for theme changes from Electron
        if (window.electronAPI?.onThemeChanged) {
            const cleanup = window.electronAPI.onThemeChanged((event, newResolvedTheme) => {
                console.log('Resolved theme changed from Electron:', newResolvedTheme);
                setActualTheme(newResolvedTheme);
            });
            return cleanup;
        }
    }, []);

    const changeTheme = (newTheme) => {
        console.log('Changing theme to:', newTheme);
        setTheme(newTheme);
        if (window.electronAPI?.setTheme) {
            window.electronAPI.setTheme(newTheme);
        }
        
        // Update actualTheme immediately for immediate feedback
        if (newTheme !== 'system') {
            setActualTheme(newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme }}>
            <div className={`app-theme-${actualTheme}`} style={{ 
                width: '100%', 
                height: '100%', 
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
};
