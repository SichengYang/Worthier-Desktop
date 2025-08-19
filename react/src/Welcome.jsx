import React from 'react';
import './Welcome.css';
import WorkingLogChart from './WorkingLogChart';
import { useTheme } from './ThemeContext';

function Welcome({ working, workingData }) {
    const { theme } = useTheme();

    // Handle both array and object formats for workingData
    const getWorkingLog = (data) => {
        // If data is an array (recentWorkingData), convert it to object format
        if (Array.isArray(data)) {
            const workingLog = {};
            data.forEach(record => {
                workingLog[record.date] = {
                    date: record.date,
                    workingMinutes: record.workingMinutes,
                    extendedSessions: record.extendedSessions || 0,
                    createdAt: record.createdAt,
                    lastUpdated: record.lastUpdated || record.createdAt
                };
            });
            return workingLog;
        }
        
        // If data is already an object (entireWorkingData), use it directly
        if (data && typeof data === 'object') {
            return data;
        }
        
        // Return empty object if no valid data
        return {};
    };

    const workingLog = getWorkingLog(workingData);

    return (
        <div className={`welcome-container app-theme-${theme}`}>
            <div className="welcome-header">
                <div className={`welcome-status ${working ? 'working' : 'not-working'}`}>
                    {working ? (
                        <>
                            <span className="status-icon">🔥</span>
                            <span>You are currently working!</span>
                        </>
                    ) : (
                        <>
                            <span className="status-icon">🌴</span>
                            <span>Life is Chill, Enjoy More!</span>
                        </>
                    )}
                </div>
            </div>
            
            <div className="welcome-chart-container">
                <h2 className="chart-title">Your 7-Day Progress</h2>
                <div className="welcome-chart">
                    <WorkingLogChart workingLog={workingLog} />
                </div>
            </div>
        </div>
    );
}

export default Welcome;