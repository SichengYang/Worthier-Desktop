import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function WorkingLogChart({ workingLog }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

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
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Working Minutes',
            data,
            backgroundColor: '#4299e1',
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { title: { display: true, text: 'Date (MM-DD)' } },
          y: { title: { display: true, text: 'Minutes' }, beginAtZero: true },
        },
      },
    });
    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [workingLog]);

  return (
    <div className="workinglog-chart-container">
      <canvas ref={chartRef} height={180}></canvas>
    </div>
  );
}
