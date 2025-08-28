const getTimeRecorder = require('./recordTime');
const getAutoLogin = require('./autologin');
const DeviceInfoManager = require('./deviceInfoManager');
const zlib = require('zlib');

/**
 * Make a fetch request with automatic token refresh on 401 responses
 * @param {string} url - The URL to make the request to
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {Object} context - Context containing user info for token refresh
 * @returns {Promise<Response>} The fetch response
 */
async function fetchWithTokenRefresh(url, options, context = {}) {
	let response = await fetch(url, options);
	
	// If we get a 401, try to refresh the token and retry once
	if (response.status === 401 && context.retryCount !== 1) {
		console.log('Received 401 response, attempting to refresh token...');
		
		try {
			// Get current token data - use userDataPath from context if available
			const userDataPath = context.userDataPath || process.env.USER_DATA_PATH || require('os').homedir() + '/.worthier-desktop';
			const autoLogin = getAutoLogin(null, userDataPath);
			const currentTokenData = await autoLogin.hasValidTokens();
			
			if (currentTokenData) {
				// Try to refresh the token
				const refreshedTokenData = await autoLogin.refreshToken(currentTokenData);
				
				if (refreshedTokenData && refreshedTokenData.accessToken) {
					console.log('Token refreshed successfully, retrying request...');
					
					// Update the request with the new token
					const updatedOptions = { ...options };
					if (updatedOptions.body) {
						const bodyData = JSON.parse(updatedOptions.body);
						bodyData.accessToken = refreshedTokenData.accessToken;
						updatedOptions.body = JSON.stringify(bodyData);
					}
					
					// Retry the request once with the new token
					response = await fetchWithTokenRefresh(url, updatedOptions, { retryCount: 1 });
				}
			}
		} catch (refreshError) {
			console.error('Failed to refresh token:', refreshError);
		}
	}
	
	return response;
}

/**
 * Get the last sync time from server for this device
 * @param {string} userID 
 * @param {string} accessToken 
 * @param {string} deviceId 
 * @param {string} username 
 * @param {string} email 
 * @returns {Promise<string|null>} ISO timestamp of last sync
 */
async function getLastServerSyncTime(userID, accessToken, deviceId, username, email) {
	try {
		const response = await fetchWithTokenRefresh('https://login.worthier.app/getLastSyncTime', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				userID,
				accessToken,
				deviceId,
				username,
				email
			}),
			signal: AbortSignal.timeout(5000),
		});
		
		if (response.ok) {
			const result = await response.json();
			return result.lastSyncTime || null;
		}
	} catch (error) {
		console.warn('Could not fetch last sync time from server, falling back to full sync:', error);
	}
	return null; // Fall back to full sync if we can't get last sync time
}

/**
 * Get only the records that have changed since the last sync
 * @param {Object} timeRecorder 
 * @param {string|null} lastSyncTime 
 * @returns {Object} Changed records only
 */
function getChangedRecordsSince(timeRecorder, lastSyncTime) {
	const allRecords = timeRecorder.loadRecords();
	
	// If no last sync time, send recent records (last 30 days) to avoid massive initial upload
	if (!lastSyncTime) {
		console.log('No last sync time found, sending recent records (last 30 days)');
		return getRecentRecordsOnly(timeRecorder, 30);
	}
	
	const lastSyncDate = new Date(lastSyncTime);
	const changedRecords = {};
	
	// Iterate through all years
	Object.keys(allRecords).forEach(year => {
		Object.keys(allRecords[year]).forEach(month => {
			Object.keys(allRecords[year][month]).forEach(day => {
				const record = allRecords[year][month][day];
				if (record.lastUpdated && new Date(record.lastUpdated) > lastSyncDate) {
					// This record has been updated since last sync
					if (!changedRecords[year]) changedRecords[year] = {};
					if (!changedRecords[year][month]) changedRecords[year][month] = {};
					changedRecords[year][month][day] = record;
				}
			});
		});
	});
	
	console.log(`Found ${Object.keys(changedRecords).length} years with changes since ${lastSyncTime}`);
	
	// Count total changed records for logging
	let totalChangedRecords = 0;
	Object.keys(changedRecords).forEach(year => {
		Object.keys(changedRecords[year] || {}).forEach(month => {
			totalChangedRecords += Object.keys(changedRecords[year][month] || {}).length;
		});
	});
	console.log(`Total changed records: ${totalChangedRecords}`);
	
	return changedRecords;
}

/**
 * Get only recent records to avoid massive uploads on first sync
 * @param {Object} timeRecorder 
 * @param {number} days 
 * @returns {Object} Recent records only
 */
function getRecentRecordsOnly(timeRecorder, days = 30) {
	const allRecords = timeRecorder.loadRecords();
	const recentRecords = {};
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);
	
	Object.keys(allRecords).forEach(year => {
		Object.keys(allRecords[year]).forEach(month => {
			Object.keys(allRecords[year][month]).forEach(day => {
				const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
				const recordDate = new Date(dateStr);
				
				if (recordDate >= cutoffDate) {
					if (!recentRecords[year]) recentRecords[year] = {};
					if (!recentRecords[year][month]) recentRecords[year][month] = {};
					recentRecords[year][month][day] = allRecords[year][month][day];
				}
			});
		});
	});
	
	return recentRecords;
}

/**
 * Compress payload and return both compressed data and headers
 * @param {Object} payload - The payload to compress
 * @returns {Object} { compressedData, headers, originalSize, compressedSize }
 */
function compressPayload(payload) {
	const payloadString = JSON.stringify(payload);
	const compressedData = zlib.gzipSync(payloadString);
	
	const originalSize = payloadString.length;
	const compressedSize = compressedData.length;
	const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);
	
	console.log(`Payload compression: ${originalSize} → ${compressedSize} bytes (${compressionRatio}% reduction)`);
	
	return {
		compressedData,
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Encoding': 'gzip',
			'X-Original-Content-Type': 'application/json',
			'X-Sync-Type': payload.syncType || 'delta'
		},
		originalSize,
		compressedSize,
		compressionRatio
	};
}

/**
 * Send HTTP request with intelligent compression
 * Only compress if payload is large enough to benefit from compression
 * @param {string} url - The endpoint URL
 * @param {Object} payload - The payload to send
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function sendCompressedRequest(url, payload, timeout = 10000) {
	const payloadString = JSON.stringify(payload);
	const payloadSize = payloadString.length;
	
	// Only compress if payload is larger than 1KB (compression overhead not worth it for small payloads)
	if (payloadSize < 1024) {
		console.log(`Payload size (${payloadSize} bytes) too small for compression, sending uncompressed`);
		return fetchWithTokenRefresh(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Sync-Type': payload.syncType || 'delta'
			},
			body: payloadString,
			signal: AbortSignal.timeout(timeout),
		});
	}
	
	const { compressedData, headers } = compressPayload(payload);
	
	return fetchWithTokenRefresh(url, {
		method: 'POST',
		headers,
		body: compressedData,
		signal: AbortSignal.timeout(timeout),
	});
}
/**
 * Upload work log for the last 7 days
 * @param {Object} options
 * @param {string} options.username
 * @param {string} options.accessToken
 * @param {string} options.email
 * @param {string} [options.userDataPath] - Optional userData path for records
 * @returns {Promise<Object>} Upload result
 */
async function uploadWorkLog(userDataPath = null) {
	const autoLogin = getAutoLogin(null, userDataPath);
	let userInfo = await autoLogin.getUserInfo();
	if (userInfo) {
		let tokenData = await autoLogin.hasValidTokens();
		if (!tokenData || !tokenData.accessToken) {
			console.error('No valid access token found');
			throw new Error('No valid access token found');
		}

		const timeRecorder = getTimeRecorder(userDataPath);
		const deviceInfoManager = new DeviceInfoManager();
		const deviceInfo = deviceInfoManager.getDeviceInfo();
		
		// Get the server's last sync timestamp
		const lastSyncTime = await getLastServerSyncTime(userInfo.id, tokenData.accessToken, deviceInfo.deviceId, userInfo.username, userInfo.email);
		
		// Get only changed records since last sync
		const changedRecords = getChangedRecordsSince(timeRecorder, lastSyncTime);
		const currentTime = timeRecorder.getLastUpdatedTime();
		
		const payload = {
			userID: userInfo.id,
			username: userInfo.username,
			email: userInfo.email,
			accessToken: tokenData.accessToken,
			deviceId: deviceInfo.deviceId,
			workingLog: changedRecords,
			lastUpdatedAt: currentTime,
			syncType: 'delta', // Indicate this is a delta update
			lastSyncTime: lastSyncTime // Include last sync time for server validation
		};

		console.log("Sending work log with delta sync and compression");

		try {
			const response = await sendCompressedRequest('https://login.worthier.app/updateLog', payload, 15000);
			
			if (response.ok) {
				const respJson = await response.json();
				if (respJson) {
					// Handle the response based on sync type
					if (payload.syncType === 'delta') {
						// For delta updates, merge the changes back
						mergeServerChanges(timeRecorder, respJson.records);
					} else {
						// For full sync, replace all records
						timeRecorder.saveRecords(respJson.records, respJson.lastUpdatedAt);
					}
					console.log('Work log uploaded successfully');
					return respJson;
				}
			} else if (response.status === 415 || response.status === 400) {
				// Server might not support compression yet, fall back to uncompressed
				console.log('Server may not support compression, falling back to uncompressed upload...');
				const fallbackResponse = await fetchWithTokenRefresh('https://login.worthier.app/updateLog', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Sync-Type': payload.syncType || 'delta'
					},
					body: JSON.stringify(payload),
					signal: AbortSignal.timeout(15000),
				});
				
				if (fallbackResponse.ok) {
					const fallbackJson = await fallbackResponse.json();
					if (fallbackJson) {
						if (payload.syncType === 'delta') {
							mergeServerChanges(timeRecorder, fallbackJson.records);
						} else {
							timeRecorder.saveRecords(fallbackJson.records, fallbackJson.lastUpdatedAt);
						}
						console.log('Work log uploaded successfully (uncompressed fallback)');
						return fallbackJson;
					}
				} else {
					const errorText = await fallbackResponse.text();
					throw new Error(`Fallback upload failed: ${fallbackResponse.status} ${fallbackResponse.statusText} - ${errorText}`);
				}
			} else if (response.status === 409) {
				// Server detected conflicts, requests full sync
				console.log('Server detected conflicts, performing full sync...');
				return performFullSync(userInfo, tokenData.accessToken, deviceInfo);
			} else if (response.status === 401 || response.status === 403) {
				// Token might be expired, try to refresh
				console.log('Access token appears to be expired (403/401), attempting refresh...');
				const refreshResult = await autoLogin.refreshToken(tokenData);
				
				if (refreshResult && refreshResult.success) {
					console.log('Token refreshed successfully, retrying upload with compression...');
					// Retry the upload with new token
					payload.accessToken = refreshResult.accessToken;
					
					const retryResponse = await sendCompressedRequest('https://login.worthier.app/updateLog', payload, 15000);
					
					if (retryResponse.ok) {
						const retryRespJson = await retryResponse.json();
						if (retryRespJson) {
							// Update local records with server response
							if (payload.syncType === 'delta') {
								// For delta updates, merge the changes back
								mergeServerChanges(timeRecorder, retryRespJson.records);
							} else {
								// For full sync, replace all records
								timeRecorder.saveRecords(retryRespJson.records, retryRespJson.lastUpdatedAt);
							}
							console.log('Work log uploaded successfully after token refresh');
							return retryRespJson;
						}
					} else if (retryResponse.status === 409) {
						// Conflict detected, server requests full sync
						console.log('Server detected conflicts, performing full sync...');
						return performFullSync(userInfo, refreshResult.accessToken, deviceInfo);
					} else {
						const errorText = await retryResponse.text();
						console.error('Retry upload failed with response:', {
							status: retryResponse.status,
							statusText: retryResponse.statusText,
							body: errorText
						});
						throw new Error(`Retry upload failed: ${retryResponse.status} ${retryResponse.statusText} - ${errorText}`);
					}
				} else {
					throw new Error('Token refresh failed. Please re-login.');
				}
			} else {
				// Get more detailed error information
				const errorText = await response.text();
				console.error('Upload failed with response:', {
					status: response.status,
					statusText: response.statusText,
					body: errorText,
					payload: payload
				});
				throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
			}
		} catch (error) {
			console.error('Error uploading work log:', error);
			throw error; // Re-throw to allow caller to handle
		}
	} else {
		console.error('No user info available for work log upload');
		throw new Error('No user info available for work log upload');
	}
}

/**
 * Merge server changes back into local records for delta updates
 * @param {Object} timeRecorder 
 * @param {Object} serverRecords 
 */
function mergeServerChanges(timeRecorder, serverRecords) {
	const localRecords = timeRecorder.loadRecords();
	
	// Merge server changes into local records
	Object.keys(serverRecords).forEach(year => {
		if (!localRecords[year]) localRecords[year] = {};
		Object.keys(serverRecords[year]).forEach(month => {
			if (!localRecords[year][month]) localRecords[year][month] = {};
			Object.keys(serverRecords[year][month]).forEach(day => {
				localRecords[year][month][day] = serverRecords[year][month][day];
			});
		});
	});
	
	timeRecorder.saveRecords(localRecords, new Date().toISOString());
}

/**
 * Perform a full sync when conflicts are detected
 * @param {Object} userInfo 
 * @param {string} accessToken 
 * @param {Object} deviceInfo 
 * @returns {Promise<Object>}
 */
async function performFullSync(userInfo, accessToken, deviceInfo) {
	const timeRecorder = getTimeRecorder();
	const allRecords = timeRecorder.loadRecords();
	const currentTime = timeRecorder.getLastUpdatedTime();
	
	// Count total records for logging
	let totalRecords = 0;
	Object.keys(allRecords).forEach(year => {
		Object.keys(allRecords[year] || {}).forEach(month => {
			totalRecords += Object.keys(allRecords[year][month] || {}).length;
		});
	});
	
	console.log(`Performing full sync with ${totalRecords} total records`);
	
	const fullSyncPayload = {
		userID: userInfo.id,
		username: userInfo.username,
		email: userInfo.email,
		accessToken: accessToken,
		deviceId: deviceInfo.deviceId,
		workingLog: allRecords,
		lastUpdatedAt: currentTime,
		syncType: 'full' // Indicate this is a full sync
	};
	
	const response = await sendCompressedRequest('https://login.worthier.app/updateLog', fullSyncPayload, 45000); // Longer timeout for full sync
	
	if (response.ok) {
		const respJson = await response.json();
		if (respJson) {
			timeRecorder.saveRecords(respJson.records, respJson.lastUpdatedAt);
			console.log('Full sync completed successfully');
			return respJson;
		}
	} else {
		const errorText = await response.text();
		console.error('Full sync failed:', {
			status: response.status,
			statusText: response.statusText,
			body: errorText
		});
		throw new Error(`Full sync failed: ${response.status} ${response.statusText} - ${errorText}`);
	}
}

/**
 * Get statistics about current data size and potential savings
 * This helps monitor the efficiency of the delta + compression approach
 * @returns {Object} Statistics object
 */
function getDataSizeStats() {
	const timeRecorder = getTimeRecorder();
	const allRecords = timeRecorder.loadRecords();
	const recentRecords = getRecentRecordsOnly(timeRecorder, 7); // Last week
	const monthRecords = getRecentRecordsOnly(timeRecorder, 30); // Last month
	
	const allSize = JSON.stringify(allRecords).length;
	const recentSize = JSON.stringify(recentRecords).length;
	const monthSize = JSON.stringify(monthRecords).length;
	
	// Simulate compression
	const allCompressed = zlib.gzipSync(JSON.stringify(allRecords)).length;
	const recentCompressed = zlib.gzipSync(JSON.stringify(recentRecords)).length;
	const monthCompressed = zlib.gzipSync(JSON.stringify(monthRecords)).length;
	
	const stats = {
		allRecords: {
			uncompressed: allSize,
			compressed: allCompressed,
			compressionRatio: Math.round((1 - allCompressed / allSize) * 100)
		},
		lastWeek: {
			uncompressed: recentSize,
			compressed: recentCompressed,
			compressionRatio: Math.round((1 - recentCompressed / recentSize) * 100)
		},
		lastMonth: {
			uncompressed: monthSize,
			compressed: monthCompressed,
			compressionRatio: Math.round((1 - monthCompressed / monthSize) * 100)
		},
		savings: {
			weekVsAll: Math.round((1 - recentCompressed / allSize) * 100),
			monthVsAll: Math.round((1 - monthCompressed / allSize) * 100)
		}
	};
	
	console.log('Data size efficiency stats:', stats);
	return stats;
}

module.exports = uploadWorkLog;
module.exports.getDataSizeStats = getDataSizeStats;
module.exports.fetchWithTokenRefresh = fetchWithTokenRefresh;
