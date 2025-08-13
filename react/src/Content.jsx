import './Content.css'
import { useRef, useEffect, useState } from 'react'
import Profile from './Profile';
import Welcome from './Welcome';

function Content({ page }) {
    const [working, setWorking] = useState(false);
    const [workingData, setWorkingData] = useState([]);

    // Debug workingData changes
    useEffect(() => {
        console.log('🔄 workingData state changed:', workingData);
        console.log('🔄 workingData length:', workingData.length);
        console.log('🔄 workingData content:', JSON.stringify(workingData, null, 2));
    }, [workingData]);

    useEffect(() => {
        console.log('Content useEffect: Setting up event listeners...');
        console.log('Content useEffect: window.electronAPI available?', !!window.electronAPI);
        console.log('Content useEffect: recentRecords function available?', !!window.electronAPI?.recentRecords);
        console.log('Content useEffect: getRecentRecords function available?', !!window.electronAPI?.getRecentRecords);

        // Set up event listeners with cleanup functions
        const startTimerCleanup = window.electronAPI?.startTimer(() => {
            setWorking(true);
        });

        const startBreakCleanup = window.electronAPI?.startBreak(() => {
            setWorking(false);
        });

        // Listen for real-time records updates from Electron
        const listenRecord = window.electronAPI?.recentRecords?.((event, records) => {
            console.log('🎯 Real-time update: Received recent records:', records);
            console.log('🎯 Real-time update: Records length:', records ? records.length : 'null/undefined');
            console.log('🎯 Real-time update: Records data:', JSON.stringify(records, null, 2));
            if (records && Array.isArray(records)) {
                setWorkingData(records);
                console.log('✅ Real-time update: Updated workingData with', records.length, 'records');
            }
        });

        // Initial fetch of records on mount
        const fetchRecords = async () => {
            try {
                console.log('📥 Initial fetch: Getting records...');
                const records = await window.electronAPI.getRecentRecords();
                console.log('📥 Initial fetch: Received records:', records);
                if (records && Array.isArray(records)) {
                    setWorkingData(records);
                    console.log('✅ Initial fetch: Set workingData with', records.length, 'records');
                }
            } catch (error) {
                console.error('❌ Initial fetch: Error getting records:', error);
            }
        };
        fetchRecords();

        return () => {
            console.log('Content useEffect: Cleaning up event listeners...');
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