import React, { useEffect, useState } from 'react';
import './Devices.css';
import WorkingLogChart from './WorkingLogChart';
import { AppleIcon, MicrosoftIcon, LinuxIcon } from './DeviceIcons';

export default function Devices() {
	const [devices, setDevices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [expandedIdx, setExpandedIdx] = useState(null);
	const [isAnimated, setIsAnimated] = useState(false);

	const fetchDevices = async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await window.electronAPI.getDeviceList();
			setDevices(result);
		} catch (err) {
			setError('Failed to fetch devices');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDevices();
		
		// Listen for device refresh events from main process
		const cleanup = window.electronAPI.onDeviceRefresh(() => {
			fetchDevices();
		});
		
		// Trigger animation after component mounts
		setTimeout(() => {
			setIsAnimated(true);
		}, 100);
		
		return cleanup;
	}, []);

		return (
			<div className={`devices-container ${isAnimated ? 'animated' : ''}`}>
				<div className="devices-header">
					<h3 className="devices-title">Devices</h3>
					<button 
						className="devices-refresh-btn" 
						onClick={fetchDevices}
						disabled={loading}
						title="Refresh device list"
					>
						<svg 
							width="20" 
							height="20" 
							viewBox="0 0 24 24" 
							fill="none" 
							stroke="currentColor" 
							strokeWidth="2"
							className={loading ? 'rotating' : ''}
						>
							<polyline points="23 4 23 10 17 10"></polyline>
							<polyline points="1 20 1 14 7 14"></polyline>
							<path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"></path>
						</svg>
					</button>
				</div>
				{loading && <p className="devices-loading">Loading...</p>}
				{error && <p className="devices-error">{error}</p>}
				{!loading && !error && (
					<ul className="devices-list">
						 {Array.isArray(devices) && devices.length > 0 ? (
						 devices.map((device, idx) => {
						 let workingLog = {};
						 try {
						 workingLog = typeof device.workingLog === 'string' ? JSON.parse(device.workingLog) : device.workingLog;
						 } catch (e) {
						 workingLog = {};
						 }
						 const isExpanded = expandedIdx === idx;
						 return (
						 <li className={`device-item ${isAnimated ? 'animated' : ''}`} key={device.id || idx} style={{ animationDelay: `${idx * 100}ms` }}>
								 <button
									 className="device-menu-btn"
									 onClick={() => setExpandedIdx(isExpanded ? null : idx)}
									 style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}
								 >
									 {device.platform === 'darwin' ? (
										 <AppleIcon size={20} />
									 ) : device.platform === 'win32' ? (
										 <MicrosoftIcon size={20} />
									 ) : (
										 <LinuxIcon size={20} />
									 )}
									 <span style={{ fontWeight: '500' }}>{device.deviceName || `Device ${idx + 1}`}</span>
								 </button>
								 <div className={`device-details-area${isExpanded ? ' expanded' : ''}`}>
									 {isExpanded && (
										 <>
											 <div className="device-details">
												 <div><strong>MAC:</strong> {device.macAddress}</div>
												 <div><strong>Platform:</strong> {device.platform} ({device.arch})</div>
												 <div><strong>Login At:</strong> {device.loginAt ? new Date(device.loginAt).toLocaleString() : ''}</div>
											 </div>
											 {workingLog && Object.keys(workingLog).length > 0 && (
												 <div className="device-chart-section">
													 <h4 className="device-chart-title">Working Log</h4>
													 <WorkingLogChart workingLog={workingLog} />
												 </div>
											 )}
										 </>
									 )}
								 </div>
						 </li>
						 );
						 })
						 ) : (
						 <li className="device-item">No devices found.</li>
						 )}
					</ul>
				)}
			</div>
		);
}
