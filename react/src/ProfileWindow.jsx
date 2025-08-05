import { useRef, useEffect, useState } from 'react';
import Login from './Login';
import './ProfileWindow.css';

function ProfileWindow() {
    const errorRef = useRef(null);
    const [userInfo, setUserInfo] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        checkLoginStatus();

        // Listen for login success events
        const handleLoginSuccess = (event, data) => {
            console.log('Login success event received:', data);
            if (data.info && data.info.user) {
                setUserInfo(data.info.user);
                setIsLoggedIn(true);
                // Clear any error messages
                if (errorRef.current) {
                    errorRef.current.textContent = '';
                }
            }
        };

        // Listen for login failure events
        const handleLoginFailed = (event, data) => {
            console.log('Login failed event received:', data);
            if (errorRef.current) {
                errorRef.current.textContent = data.error || 'Login failed';
            }
            setIsLoggedIn(false);
        };

        // Listen for logout success events
        const handleLogoutSuccess = (event, data) => {
            console.log('Logout success event received:', data);
            setUserInfo(null);
            setIsLoggedIn(false);
            if (errorRef.current) {
                errorRef.current.textContent = '';
            }
        };

        window.electronAPI?.onLoginSuccess?.(handleLoginSuccess);
        window.electronAPI?.onLoginFailed?.(handleLoginFailed);
        window.electronAPI?.onLogoutSuccess?.(handleLogoutSuccess);

        // Cleanup function to remove event listener if needed
        return () => {
            // Note: electron IPC doesn't provide a direct way to remove listeners
            // but this is good practice for React cleanup
        };
    }, []);

    const checkLoginStatus = async () => {
        try {
            const user = await window.electronAPI?.getCurrentUser?.();
            if (user) {
                setUserInfo(user);
                setIsLoggedIn(true);
            } else {
                setIsLoggedIn(false);
            }
        } catch (error) {
            console.error('Error checking login status:', error);
            setIsLoggedIn(false);
        }
    };

    const handleLoginMicrosoft = async () => {
        try {
            // Clear any previous error messages
            if (errorRef.current) {
                errorRef.current.textContent = '';
            }
            await window.electronAPI?.loginWithMicrosoft?.();
            // The onLoginSuccess event will handle the UI update
        } catch (error) {
            if (errorRef.current) {
                errorRef.current.textContent = error.message || 'Login failed';
            }
        }
    };

    const handleLoginGoogle = async () => {
        try {
            // Clear any previous error messages
            if (errorRef.current) {
                errorRef.current.textContent = '';
            }
            await window.electronAPI?.loginWithGoogle?.();
            // The onLoginSuccess event will handle the UI update
        } catch (error) {
            if (errorRef.current) {
                errorRef.current.textContent = error.message || 'Login failed';
            }
        }
    };

    const handleLoginApple = async () => {
        try {
            // Clear any previous error messages
            if (errorRef.current) {
                errorRef.current.textContent = '';
            }
            await window.electronAPI?.loginWithApple?.();
            // The onLoginSuccess event will handle the UI update
        } catch (error) {
            if (errorRef.current) {
                errorRef.current.textContent = error.message || 'Login failed';
            }
        }
    };

    const handleLogout = async () => {
        try {
            await window.electronAPI?.logout?.();
            // The onLogoutSuccess event will handle the UI update
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (!isLoggedIn) {
        return (
            <Login
                onLoginMicrosoft={handleLoginMicrosoft}
                onLoginGoogle={handleLoginGoogle}
                onLoginApple={handleLoginApple}
                errorRef={errorRef}
            />
        );
    }

    return (
        <div className="content-frame profile-frame">
            <h3>Your Profile</h3>
            <div className='main-content'>
                {userInfo && (
                    <div className="profile-info">
                        <div className="profile-field">
                            <strong>Name:</strong> {userInfo.username || userInfo.name || userInfo.displayName || 'Not available'}
                        </div>
                        <div className="profile-field">
                            <strong>Email:</strong> {userInfo.email || 'Not available'}
                        </div>
                        {userInfo.id && (
                            <div className="profile-field">
                                <strong>User ID:</strong> {userInfo.id}
                            </div>
                        )}
                        {userInfo.picture && (
                            <div className="profile-field">
                                <strong>Picture:</strong>
                                <img src={userInfo.picture} alt="Profile" className="profile-picture" />
                            </div>
                        )}
                    </div>
                )}
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </div>
    );
}

export default ProfileWindow;
