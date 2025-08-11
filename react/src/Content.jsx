import './Content.css'
import { useRef, useEffect, useState } from 'react'
import Profile from './Profile';
import Welcome from './Welcome';

function Content({ page }) {
    const [working, setWorking] = useState(false);
    const [workingData, setWorkingData] = useState([]);

    useEffect(() => {
        // Set up event listeners with cleanup functions
        const startTimerCleanup = window.electronAPI?.startTimer(() => {
            setWorking(true);
        });

        const startBreakCleanup = window.electronAPI?.startBreak(() => {
            setWorking(false);
        });

        // Listen for recent records from Electron
        const listenRecord = window.electronAPI?.recentRecords((event, records) => {
            console.log('Received recent records:', records);
            setWorkingData(records);
        });

        return () => {
            startTimerCleanup?.();
            startBreakCleanup?.();
            listenRecord?.();
        };
    }, []);

    return (
        <>
            {page === 0 ? (
                <Welcome working={working} workingData={workingData} />
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