import { useRef } from 'react';
import { useUser } from './UserContext';
import Login from './Login';
import './ProfileWindow.css';

function ProfileWindow() {
    const errorRef = useRef(null);
    const { userInfo, isLoggedIn, isLoading } = useUser();

    const handleLoginMicrosoft = async () => {
        try {
            // Clear any previous error messages
            if (errorRef.current) {
                errorRef.current.textContent = '';
            }
            await window.electronAPI?.loginWithMicrosoft?.();
            // UserContext will handle the UI update via events
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
            // UserContext will handle the UI update via events
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
            // UserContext will handle the UI update via events
        } catch (error) {
            if (errorRef.current) {
                errorRef.current.textContent = error.message || 'Login failed';
            }
        }
    };

    const handleLogout = async () => {
        try {
            await window.electronAPI?.logout?.();
            // UserContext will handle the UI update via events
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="content-frame profile-frame">
                <h3>Loading...</h3>
                <div className='main-content'>
                    <div className="profile-field">
                        Checking login status...
                    </div>
                </div>
            </div>
        );
    }

    // Show login form if not logged in
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

    // Show profile information if logged in
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
