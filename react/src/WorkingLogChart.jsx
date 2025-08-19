import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { useTheme } from './ThemeContext';

Chart.register(...registerables);

export default function WorkingLogChart({ workingLog }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const { theme } = useTheme(); // Single resolved theme value

  useEffect(() => {
    if (!workingLog || Object.keys(workingLog).length === 0) return;
    const ctx = chartRef.current.getContext('2d');
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    // Always show last 7 days (including today), fill missing dates with 0
    const today = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const getDateStr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const getLabelStr = d => `${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const last7Dates = Array.from({length: 7}, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - 6 + i);
      return { key: getDateStr(d), label: getLabelStr(d) };
    });
    const data = last7Dates.map(({ key }) => (workingLog[key]?.workingMinutes ?? 0));
    const labels = last7Dates.map(({ label }) => label);
    
    // Theme-aware colors - theme is now always resolved (never "system")
    const getChartColors = () => {
      console.log('Resolved theme for styling:', theme);
      switch (theme) {
        case 'dark':
          return {
            backgroundColor: '#4ade80', // Keep green bars for consistency
            textColor: '#e2e8f0', // Softer light gray instead of pure white
            gridColor: '#9ca3af' // Dimmer gray for grid lines
          };
        case 'pink':
          return {
            backgroundColor: '#ec4899',
            textColor: '#831843',
            gridColor: '#f3e8ff'
          };
        default: // light
          return {
            backgroundColor: '#4ade80', // Green to match Welcome's original styling
            textColor: '#374151',
            gridColor: '#d1d5db'
          };
      }
    };
    
    const colors = getChartColors();
    console.log('Chart colors being used:', colors);
    
    // Force dimmer light colors for dark theme (theme is now always resolved)
    const isDarkTheme = theme === 'dark';
    const forceWhiteIfDark = isDarkTheme ? '#e2e8f0' : colors.textColor; // Softer light gray
    console.log('isDarkTheme:', isDarkTheme, 'forceWhiteIfDark:', forceWhiteIfDark);
    
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Working Minutes',
            data,
            backgroundColor: colors.backgroundColor,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.5, /* Width to height ratio */
        backgroundColor: 'transparent',
        color: forceWhiteIfDark, // Force white for dark themes
        plugins: {
          legend: { 
            display: true,
            position: 'top',
            labels: {
              color: forceWhiteIfDark,
              font: {
                size: 16,
                weight: '900' // Extra bold for legend
              }
            }
          },
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: 'Date (MM-DD)',
              color: forceWhiteIfDark,
              font: {
                size: 14,
                weight: '900' // Extra bold
              }
            },
            ticks: { 
              color: forceWhiteIfDark,
              font: {
                size: 13,
                weight: '800' // Extra bold
              }
            },
            grid: { 
              color: isDarkTheme ? '#6b7280' : colors.gridColor, // Dimmer gray for dark theme grid
              lineWidth: 1
            }
          },
          y: { 
            title: { 
              display: true, 
              text: 'Working Time',
              color: forceWhiteIfDark,
              font: {
                size: 14,
                weight: '900' // Extra bold
              }
            }, 
            beginAtZero: true,
            ticks: { 
              color: forceWhiteIfDark,
              font: {
                size: 13,
                weight: '800' // Extra bold
              },
              callback: function(value) {
                // Format minutes into hours and minutes
                if (value === 0) return '0 min';
                const hours = Math.floor(value / 60);
                const mins = value % 60;
                
                if (hours === 0) return `${mins}min`;
                if (mins === 0) return `${hours}hr`;
                return `${hours}hr ${mins}min`;
              }
            },
            grid: { 
              color: isDarkTheme ? '#6b7280' : colors.gridColor, // Dimmer gray for dark theme grid
              lineWidth: 1
            }
          },
        },
      },
    });
    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [workingLog, theme]); // Back to watching single theme value

  return (
    <div className="workinglog-chart-container">
      <canvas ref={chartRef} style={{width: '100%', height: '100%'}}></canvas>
    </div>
  );
}
