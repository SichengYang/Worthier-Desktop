import './Content.css'
import { useRef, useEffect, useState } from 'react'

function Content({ page }) {
    const timer = useRef(null);
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
            console.log(data);
            setMessage(`Platform: ${data.platform}, Code: ${data.code}`);
            setLoggedIn(true);
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
                    </div>
                )
            )}
        </>
    )
}


export default Content