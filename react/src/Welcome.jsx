import React from 'react';
import './Welcome.css';
import WorkingLogChart from './WorkingLogChart';
import { useTheme } from './ThemeContext';

function Welcome({ working, workingData }) {
    const { theme } = useTheme();

    // Handle both array and object formats for workingData
    const getWorkingLog = (data) => {
        // If data is an array (recentWorkingData), convert it to new nested format
        if (Array.isArray(data)) {
            const workingLog = {};
            data.forEach(record => {
                // Parse date to get year, month, day
                const [year, month, day] = record.date.split('-');
                const monthNum = parseInt(month, 10);
                const dayNum = parseInt(day, 10);
                
                // Create nested structure: workingLog[year][month][day]
                if (!workingLog[year]) workingLog[year] = {};
                if (!workingLog[year][monthNum]) workingLog[year][monthNum] = {};
                workingLog[year][monthNum][dayNum] = {
                    workingMinutes: record.workingMinutes,
                    extendedSessions: record.extendedSessions || 0
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