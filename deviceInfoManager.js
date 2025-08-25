const os = require('os');
const { execSync } = require('child_process');
const generateStableDeviceId = require('./generateDeviceID');

class DeviceInfoManager {
    constructor() {
        this.pendingUploads = [];
    }

    getDeviceName() {
        try {
            switch (process.platform) {
                case 'darwin': // macOS
                    return execSync('scutil --get ComputerName', { encoding: 'utf8' }).trim();
                case 'win32': // Windows
                    return execSync('hostname', { encoding: 'utf8' }).trim();
                case 'linux': // Linux
                    return execSync('hostname', { encoding: 'utf8' }).trim();
                default:
                    return os.hostname();
            }
        } catch (error) {
            console.warn('Could not get device name, falling back to hostname:', error.message);
            return os.hostname();
        }
    }

    getDeviceInfo() {
        try {
            const deviceId = generateStableDeviceId();
            const deviceName = this.getDeviceName();
            const deviceInfo = {
                deviceId: deviceId,
                platform: process.platform,
                arch: process.arch,
                deviceName: deviceName,
            };
            return deviceInfo;
        } catch (error) {
            console.error('Error getting device info:', error);
            const deviceName = this.getDeviceName();
            return {
                deviceId: 'unknown',
                platform: process.platform,
                arch: process.arch,
                deviceName: deviceName,
            };
        }
    }

    async uploadDeviceInfo(sessionId) {
        try {
            const deviceInfo = this.getDeviceInfo();
            console.log('Uploading device info:', deviceInfo);

            const response = await fetch('https://login.worthier.app/deviceInfo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...deviceInfo,
                    sessionID: sessionId
                }),
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Device info uploaded successfully:', result);
                return result;
            } else {
                const errorMsg = `Failed to upload device info: ${response.status} ${response.statusText}`;
                
                if (response.status === 404) {
                    console.log('Device registration endpoint not yet deployed - this is expected during development');
                } else {
                    console.error(errorMsg);
                }

                // Add to pending uploads if it's a server error (not client errors like 404)
                if (response.status >= 500) {
                    this.addToPendingUploads(deviceInfo, sessionId);
                }
                return null;
            }
        } catch (error) {
            console.error('Error uploading device info:', error);

            // Add to pending uploads for network errors
            if (error.name === 'TypeError' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                this.addToPendingUploads(deviceInfo, sessionId);
            }
            return null;
        }
    }

    addToPendingUploads(deviceInfo, sessionId) {
        const uploadData = {
            deviceInfo,
            sessionId,
            timestamp: new Date().toISOString()
        };

        // Remove any existing pending upload for the same device to avoid duplicates
        this.pendingUploads = this.pendingUploads.filter(
            upload => upload.deviceInfo.deviceId !== deviceInfo.deviceId
        );

        this.pendingUploads.push(uploadData);
        console.log('Added device info to pending uploads:', uploadData);
    }

    async retryPendingUploads() {
        if (this.pendingUploads.length === 0) {
            return;
        }

        console.log(`Retrying ${this.pendingUploads.length} pending device info uploads...`);

        const uploads = [...this.pendingUploads];
        this.pendingUploads = [];

        for (const upload of uploads) {
            const result = await this.uploadDeviceInfo(upload.sessionId);

            if (!result) {
                // If it still fails, it will be added back to pending uploads
                console.log('Retry failed for device info upload');
            }
        }
    }

    // Call this method when network connectivity is restored
    async onNetworkRestored() {
        await this.retryPendingUploads();
    }
}

module.exports = DeviceInfoManager;
