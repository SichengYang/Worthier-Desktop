import './Content.css'
import { useRef, useEffect, useState, use } from 'react'

function Content({ page }) {
    const timer = useRef(null);
    const error = useRef(null);
    const [message, setMessage] = useState("");
    const [loggedIn, setLoggedIn] = useState(false);


    useEffect(() => {
        window.electronAPI?.startTimer(() => {
            setMessage("Work started!");
        });

        window.electronAPI?.startBreak(() => {
            setMessage("Break started!");
        });

        window.electronAPI?.onLoginSuccess((event, data) => {
            console.log('Full login data:', data);

            let email = 'Unknown User';
            if (data.info) {
                // Check different possible email locations
                email = data.info.user?.email || 'Unknown User';
                console.log('Extracted email:', email);
                setMessage("Login success! " + email);
                setLoggedIn(true);
            }
            else if (data.error) {
                console.error('Login failed:', data.error);
                error.current.textContent = data.error;
            }
        });
    }, []);

    return (
        <>
            {page === 0 ? (
                <div className="content-frame">
                    <p ref={timer}>
                        {message}
                    </p>
                </div>
            ) : page === 1 ? (
                <div className="content-frame">1</div>
            ) : page === 2 ? (
                <div className="content-frame">2</div>
            ) : (
                loggedIn ? (
                    <div className="content-frame">
                        <p>
                            {message}
                        </p>
                    </div>
                ) : (
                    <div className="login-frame">
                        <button
                            className="microsoft-login-btn"
                            onClick={() => window.electronAPI?.loginWithMicrosoft?.()}
                        >
                            <i className="bi bi-microsoft" style={{ marginRight: 8 }}></i>
                            Login with Microsoft
                        </button>
                        <button
                            className="google-login-btn"
                            onClick={() => window.electronAPI?.loginWithGoogle?.()}
                        >
                            <i className="bi bi-google" style={{ marginRight: 8 }}></i>
                            Login with Google
                        </button>
                        <button
                            className="apple-login-btn"
                            onClick={() => window.electronAPI?.loginWithApple?.()}
                        >
                            <i className="bi bi-apple" style={{ marginRight: 8 }}></i>
                            Login with Google
                        </button>
                        <p ref={error} className="error-message"></p>
                    </div>
                )
            )}
        </>
    )
}


export default Content