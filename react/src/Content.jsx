import './Content.css'
import { useRef, useEffect, useState, use } from 'react'
import Login from './Login';
import Profile from './Profile';

function Content({ page }) {
    const timer = useRef(null);
    const error = useRef(null);
    const [message, setMessage] = useState(""); // username
    const [userMessage, setUserMessage] = useState("");
    const [loggedIn, setLoggedIn] = useState(false);


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
                let username = data.info.user?.username || 'Unknown User';
                console.log('Extracted username:', username);
                setMessage(username);
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
                        {userMessage}
                    </h3>
                </div>
            ) : page === 1 ? (
                <div className="content-frame">1</div>
            ) : page === 2 ? (
                <div className="content-frame">2</div>
            ) : (
                loggedIn ? (
                    <Profile
                        username={message}
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