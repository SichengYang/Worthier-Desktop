import React, { useEffect, useState } from 'react';
import './Devices.css';
import WorkingLogChart from './WorkingLogChart';
import { AppleIcon, MicrosoftIcon } from './DeviceIcons';

export default function Devices() {
	const [devices, setDevices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [expandedIdx, setExpandedIdx] = useState(null);

	useEffect(() => {
		async function fetchDevices() {
			try {
				const result = await window.electronAPI.getDeviceList();
				setDevices(result);
			} catch (err) {
				setError('Failed to fetch devices');
			} finally {
				setLoading(false);
			}
		}
		fetchDevices();
	}, []);

		return (
			<div className="devices-container">
				<h3 className="devices-title">Devices</h3>
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
						 <li className="device-item" key={device.id || idx}>
								 <button
									 className="device-menu-btn"
									 onClick={() => setExpandedIdx(isExpanded ? null : idx)}
									 style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
								 >
									 {device.platform === 'darwin' ? <AppleIcon size={24} /> : device.platform === 'win32' ? <MicrosoftIcon size={24} /> : null}
									 <span>{device.deviceName || `Device ${idx + 1}`}</span>
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
