import './Content.css'
import { useRef, useEffect, useState } from 'react'
import Profile from './Profile';
import Welcome from './Welcome';
import Devices from './Devices';
import Share from './Share';

function Content({ page }) {
    const [working, setWorking] = useState(false);
    const [recentWorkingData, setRecentWorkingData] = useState([]);
    const [entireWorkingData, setEntireWorkingData] = useState({});

    // Debug recentWorkingData changes
    useEffect(() => {
        console.log('🔄 recentWorkingData state changed:', recentWorkingData);
        console.log('🔄 recentWorkingData length:', Array.isArray(recentWorkingData) ? recentWorkingData.length : 'not array');
        console.log('🔄 recentWorkingData content:', JSON.stringify(recentWorkingData, null, 2));
    }, [recentWorkingData]);

    // Debug entireWorkingData changes
    useEffect(() => {
        console.log('🗂️ entireWorkingData state changed:', entireWorkingData);
        console.log('🗂️ entireWorkingData keys count:', Object.keys(entireWorkingData).length);
    }, [entireWorkingData]);

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
                // Update recent working data (array format)
                setRecentWorkingData(records);
                console.log('✅ Real-time update: Updated recentWorkingData with', records.length, 'records');
                
                // Also update entire working data (merge with existing object)
                const recentRecordsObj = {};
                records.forEach(record => {
                    recentRecordsObj[record.date] = record;
                });
                
                setEntireWorkingData(prevData => {
                    const updatedData = { ...prevData, ...recentRecordsObj };
                    console.log('✅ Real-time update: Updated entireWorkingData with', Object.keys(updatedData).length, 'total records');
                    return updatedData;
                });
            }
        });

        // Initial fetch of recent records for charts/welcome components
        const fetchRecentRecords = async () => {
            try {
                console.log('📥 Initial fetch: Getting recent records...');
                const records = await window.electronAPI.getRecentRecords();
                console.log('📥 Initial fetch: Received recent records:', records);
                if (records && Array.isArray(records)) {
                    setRecentWorkingData(records);
                    console.log('✅ Initial fetch: Set recentWorkingData with', records.length, 'records');
                }
            } catch (error) {
                console.error('❌ Initial fetch: Error getting recent records:', error);
            }
        };

        // Initial fetch of all records for calendar
        const fetchAllRecords = async () => {
            try {
                console.log('📥 Initial fetch: Getting all records...');
                const records = await window.electronAPI.getAllRecords();
                console.log('📥 Initial fetch: Received all records:', records);
                if (records && typeof records === 'object') {
                    setEntireWorkingData(records);
                    console.log('✅ Initial fetch: Set entireWorkingData with', Object.keys(records).length, 'records');
                }
            } catch (error) {
                console.error('❌ Initial fetch: Error getting all records:', error);
            }
        };

        fetchRecentRecords();
        fetchAllRecords();

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
                <Welcome working={working} workingData={recentWorkingData} />
            ) : page === 1 ? (
                <Share workingData={entireWorkingData} />
            ) : page === 2 ? (
                <Devices />
            ) : (
                <Profile />
            )}
        </>
    )
}

export default Content