import './Content.css'
import { useRef, useEffect, useState } from 'react'
import Profile from './Profile';

function Content({ page }) {
    const timer = useRef(null);
    const [userMessage, setUserMessage] = useState("");

    useEffect(() => {
        // Set up event listeners with cleanup functions
        const startTimerCleanup = window.electronAPI?.startTimer(() => {
            setUserMessage("Work started!");
        });

        const startBreakCleanup = window.electronAPI?.startBreak(() => {
            setUserMessage("Break started!");
        });

        // Cleanup function to remove event listeners when component unmounts
        return () => {
            if (typeof startTimerCleanup === 'function') {
                startTimerCleanup();
            }
            if (typeof startBreakCleanup === 'function') {
                startBreakCleanup();
            }
        };
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