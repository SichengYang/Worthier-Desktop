import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

export const UserProvider = ({ children }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUserInfo = async () => {
        try {
            console.log('🔍 Fetching user information...');
            const user = await window.electronAPI?.getCurrentUser?.();
            if (user) {
                console.log('✅ User information fetched successfully:', user.username || user.email);
                setUserInfo(user);
                setIsLoggedIn(true);
            } else {
                console.log('❌ No user logged in');
                setUserInfo(null);
                setIsLoggedIn(false);
            }
        } catch (error) {
            console.error('❌ Error fetching user information:', error);
            setUserInfo(null);
            setIsLoggedIn(false);
        } finally {
            setIsLoading(false);
        }
    };

    const loginUser = (user) => {
        console.log('🔐 User logged in:', user.username || user.email);
        setUserInfo(user);
        setIsLoggedIn(true);
        setIsLoading(false);
    };

    const logoutUser = () => {
        console.log('🚪 User logged out');
        setUserInfo(null);
        setIsLoggedIn(false);
        setIsLoading(false);
    };

    useEffect(() => {
        // Listen for login success events
        const handleLoginSuccess = (event, data) => {
            console.log('🎉 Login success event received');
            if (data.info && data.info.user) {
                loginUser(data.info.user);
            }
        };

        // Listen for login failure events
        const handleLoginFailed = (event, data) => {
            console.log('💥 Login failed event received:', data.error || 'Unknown error');
            setIsLoggedIn(false);
            setUserInfo(null);
            setIsLoading(false);
        };

        // Listen for logout success events
        const handleLogoutSuccess = (event, data) => {
            console.log('👋 Logout success event received');
            logoutUser();
        };

        // Set up event listeners
        const loginSuccessCleanup = window.electronAPI?.onLoginSuccess?.(handleLoginSuccess);
        const loginFailedCleanup = window.electronAPI?.onLoginFailed?.(handleLoginFailed);
        const logoutSuccessCleanup = window.electronAPI?.onLogoutSuccess?.(handleLogoutSuccess);

        // Fetch user info on initial load (for existing sessions)
        fetchUserInfo();

        // Cleanup function to remove event listeners
        return () => {
            if (typeof loginSuccessCleanup === 'function') {
                loginSuccessCleanup();
            }
            if (typeof loginFailedCleanup === 'function') {
                loginFailedCleanup();
            }
            if (typeof logoutSuccessCleanup === 'function') {
                logoutSuccessCleanup();
            }
        };
    }, []);

    const value = {
        userInfo,
        isLoggedIn,
        isLoading,
        fetchUserInfo,
        loginUser,
        logoutUser
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
