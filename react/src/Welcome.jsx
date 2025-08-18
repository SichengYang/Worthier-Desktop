import React, { useEffect, useRef } from 'react';
import './Welcome.css';
import { Chart, registerables } from 'chart.js';
import { useTheme } from './ThemeContext';

Chart.register(...registerables);

function Welcome({ working, workingData }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const { theme } = useTheme();

    useEffect(() => {
        console.log('Chart useEffect triggered. Theme:', theme, 'WorkingData length:', workingData.length);
        
        if (chartRef.current && workingData.length > 0) {
            const ctx = chartRef.current.getContext('2d');

            // Destroy the existing chart instance if it exists
            if (chartInstanceRef.current) {
                console.log('Destroying existing chart');
                chartInstanceRef.current.destroy();
            }

            // Get theme colors
            const colors = getThemeColors(theme);
            console.log('Using colors for theme', theme, ':', colors);

            // Create a new chart instance and store it in the reference
            chartInstanceRef.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: workingData.map(record => formatDate(record.date)),
                    datasets: [
                        {
                            label: 'Working Minutes',
                            data: workingData.map(record => record.workingMinutes),
                            backgroundColor: 'transparent', // Set transparent background
                            borderColor: colors.primary,
                            borderWidth: 2,
                            borderRadius: 8,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    backgroundColor: 'transparent',
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: colors.text,
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            }
                        },
                    },
                    scales: {
                        x: {
                            grid: {
                                color: colors.grid,
                            },
                            ticks: {
                                color: colors.text,
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: colors.grid,
                            },
                            ticks: {
                                color: colors.text,
                            }
                        },
                    },
                },
            });
            console.log('New chart created');
        }

        // Cleanup function to destroy the chart when the component unmounts
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [workingData, theme]);

    const formatDate = (dateStr) => {
        // Parse YYYY-MM-DD as local date to avoid timezone issues
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const getThemeColors = (currentTheme) => {
        const themes = {
            light: {
                primary: '#4ade80',
                secondary: '#10b981',
                text: '#374151',
                grid: '#d1d5db',
                background: '#ffffff'
            },
            dark: {
                primary: '#3b82f6',
                secondary: '#1d4ed8',
                text: '#f3f4f6',
                grid: '#4b5563',
                background: '#1f2937'
            },
            pink: {
                primary: '#ec4899',
                secondary: '#be185d',
                text: '#831843',
                grid: '#f3e8ff',
                background: '#fdf2f8'
            }
        };
        return themes[currentTheme] || themes.light;
    };

    return (
        <div className={`welcome-container theme-${theme}`}>
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
                    <canvas ref={chartRef}></canvas>
                </div>
            </div>
        </div>
    );
}

export default Welcome;