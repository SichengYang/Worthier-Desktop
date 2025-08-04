import './Content.css'
import { useRef, useEffect, useState, use } from 'react'
import Login from './Login';
import Profile from './Profile';

function Content({ page }) {
    const timer = useRef(null);
    const error = useRef(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const [userMessage, setUserMessage] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        window.electronAPI?.startTimer(() => {
            setUserMessage("Work started!");
        });

        window.electronAPI?.startBreak(() => {
            setUserMessage("Break started!");
        });

        window.electronAPI?.onLoginSuccess((event, data) => {
            console.log('Full login data:', data);

            if (data.info) {
                // Check different possible email locations
                let username = data.info.user?.username || 'Online User';
                console.log('Extracted username:', username);
                setUsername(username);

                let email = data.info.user?.email || 'Error retrieving email';
                console.log('Extracted email:', email);
                setEmail(email);

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
                    <h3 ref={timer}>
                        {userMessage || "Welcome to Worthier!"}
                    </h3>
                </div>
            ) : page === 1 ? (
                <div className="content-frame">1</div>
            ) : page === 2 ? (
                <div className="content-frame">2</div>
            ) : (
                loggedIn ? (
                    <Profile
                        username={username}
                        email={email}
                        onLogout={() => {
                            window.electronAPI?.logout?.();
                            setLoggedIn(false);
                        }}
                    />
                ) : (
                    <Login errorRef={error} />
                )
            )}
        </>
    )
}


export default Content