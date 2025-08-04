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
        // Listen for theme changes from Electron
        if (window.electronAPI?.onThemeChanged) {
            const cleanup = window.electronAPI.onThemeChanged((event, newTheme) => {
                console.log('Theme changed from Electron:', newTheme);
                setTheme(newTheme);
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
