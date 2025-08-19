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

    useEffect(() => {
        // Load initial theme settings
        const loadInitialTheme = async () => {
            if (window.electronAPI?.getThemeSettings) {
                try {
                    const themeSettings = await window.electronAPI.getThemeSettings();
                    console.log('Loaded theme settings:', themeSettings);
                    // Use the resolved theme directly - no need for dual state
                    setTheme(themeSettings.resolvedTheme || 'light');
                } catch (error) {
                    console.error('Error loading theme settings:', error);
                    setTheme('light');
                }
            }
        };
        
        loadInitialTheme();

        // Listen for theme changes from Electron
        if (window.electronAPI?.onThemeChanged) {
            const cleanup = window.electronAPI.onThemeChanged((event, newResolvedTheme) => {
                console.log('Resolved theme changed from Electron:', newResolvedTheme);
                setTheme(newResolvedTheme);
            });
            return cleanup;
        }
    }, []);

    const changeTheme = (newTheme) => {
        console.log('Changing theme to:', newTheme);
        if (window.electronAPI?.setTheme) {
            window.electronAPI.setTheme(newTheme);
        }
        
        // For immediate feedback, if it's not system theme, set it directly
        if (newTheme !== 'system') {
            setTheme(newTheme);
        }
        // For system theme, let the backend resolve and send back the actual theme
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme }}>
            <div className={`app-theme-${theme}`} style={{ 
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
