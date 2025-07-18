import './Content.css'
import { useRef, useEffect, useState } from 'react'

function Content({ page }) {
    const timer = useRef(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        window.electronAPI?.startTimer(() => {
            setMessage("Work started!");
        });

        window.electronAPI?.startBreak(() => {
            setMessage("Break started!");
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
                <div className="content-frame">2</div>
            ) : page === 2 ? (
                <div className="content-frame">3</div>
            ) : (
                <div className="content-frame">4</div>
            )}
        </>
    )
}


export default Content