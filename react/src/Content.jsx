import './Content.css'
import { useRef, useEffect, useState } from 'react'
import Profile from './Profile';

function Content({ page }) {
    const timer = useRef(null);
    const [userMessage, setUserMessage] = useState("");

    useEffect(() => {
        window.electronAPI?.startTimer(() => {
            setUserMessage("Work started!");
        });

        window.electronAPI?.startBreak(() => {
            setUserMessage("Break started!");
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
                <Profile />
            )}
        </>
    )
}

export default Content