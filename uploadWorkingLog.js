const getTimeRecorder = require('./recordTime');
const fs = require('fs');
const getAutoLogin = require('./autologin');
/**
 * Upload work log for the last 7 days
 * @param {Object} options
 * @param {string} options.username
 * @param {string} options.accessToken
 * @param {string} options.email
 * @param {string} [options.userDataPath] - Optional userData path for records
 * @returns {Promise<Object>} Upload result
 */
async function uploadWorkLog() {
	const autoLogin = getAutoLogin();
	let userInfo = await autoLogin.getUserInfo();
	if (userInfo) {
		let tokenData = await autoLogin.hasValidTokens();
		const timeRecorder = getTimeRecorder();
		const records = timeRecorder.loadRecords();
		const time = timeRecorder.getLastUpdatedTime();
		const payload = {
			userID: userInfo.id,
			username: userInfo.username,
			email: userInfo.email,
			accessToken: tokenData.accessToken,
			workingLog: records,
			time: time
		};

		console.log("Sending work log:", payload);

		try {
			const response = await fetch('https://login.worthier.app/updateLog', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
				signal: AbortSignal.timeout(10000), // 10s timeout
			});
			if (response.ok) {
				const respJson = await response.json();
				if (respJson && respJson.records) {
					timeRecorder.saveRecords(respJson.records);
					console.log('Work log uploaded successfully:', respJson.records);
				}
			} else {
				throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
			}
		} catch (error) {
			console.error('Error uploading work log:', error);
		}
	}
}

module.exports = uploadWorkLog;
