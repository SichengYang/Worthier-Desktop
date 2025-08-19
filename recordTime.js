const fs = require('fs');
const path = require('path');

class TimeRecorder {
    constructor(userDataPath = null) {
        // If userDataPath is provided, use it directly
        if (userDataPath) {
            this.recordsPath = path.join(userDataPath, 'records.json');
        } else {
            // Try to get userData path from Electron app
            try {
                const { app } = require('electron');
                if (!app || typeof app.isReady !== 'function') {
                    throw new Error('Electron app is not properly initialized. Ensure the app module is correctly imported and initialized.');
                }

                if (!app.isReady()) {
                    throw new Error('Electron app is not ready. Ensure app.whenReady() is awaited before initializing TimeRecorder.');
                }

                this.recordsPath = path.join(app.getPath('userData'), 'records.json');
            } catch (error) {
                throw new Error('No userData path provided and Electron app is not available. Please provide userData path.');
            }
        }

        if (!fs.existsSync(this.recordsPath)) {
            // Ensure the directory exists before writing
            const dir = path.dirname(this.recordsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }

        // Load today's record or create a new one if it doesn't exist
        this.currentRecord = this.loadTodaysRecord();

        console.log(`Time records will be stored at: ${this.recordsPath}`);
    }

    /**
     * Get the path where time records are stored
     */
    getStoragePath() {
        return this.recordsPath;
    }

    /**
     * Get today's date in YYYY-MM-DD format using local timezone
     */
    getTodaysDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    loadFile() {
        try {
            const data = fs.readFileSync(this.recordsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading file:', error);
            return null;
        }
    }

    /**
     * Load existing records from file
     */
    loadRecords() {
        return this.loadFile()?.records || {};
    }

    /**
     * Save records to file
     */
    saveRecords(records) {
        let currentTime = new Date().toISOString();
        let writeJson = {
            records: records,
            lastUpdatedAt: currentTime
        };
        try {
            const dir = path.dirname(this.recordsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.recordsPath, JSON.stringify(writeJson, null, 2));
        } catch (error) {
            console.error('Error saving time records:', error);
            console.error('Attempted to save to:', this.recordsPath);
        }
    }

    /**
     * Load today's record, creating a new one if it's a new day
     */
    loadTodaysRecord() {
        const records = this.loadRecords();
        const today = this.getTodaysDate();

        if (!records[today]) {
            // New day, start from 0
            records[today] = {
                date: today,
                workingMinutes: 0,
                extendedSessions: 0,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
            this.saveRecords(records);
        }

        return records[today];
    }

    /**
     * Add minutes to today's working time
     * @param {number} minutes - Number of minutes to add (default: 1)
     */
    addMinutes(minutes = 1) {
        const today = this.getTodaysDate();

        // Check if we need to switch to a new day
        if (this.currentRecord.date !== today) {
            console.log(`New day detected. Previous date: ${this.currentRecord.date}, Today: ${today}`);
            this.currentRecord = this.loadTodaysRecord();
        }

        // Add minutes to current record
        this.currentRecord.workingMinutes += minutes;
        this.currentRecord.lastUpdated = new Date().toISOString();

        // Save updated record
        const records = this.loadRecords();
        records[today] = this.currentRecord;
        this.saveRecords(records);

        console.log(`Added ${minutes} minute(s). Total today: ${this.currentRecord.workingMinutes} minutes`);

        return this.currentRecord.workingMinutes;
    }

    /**
     * Add one to today's extended session count
     */
    addExtendedSession() {
        const today = this.getTodaysDate();

        // Check if we need to switch to a new day
        if (this.currentRecord.date !== today) {
            console.log(`New day detected. Previous date: ${this.currentRecord.date}, Today: ${today}`);
            this.currentRecord = this.loadTodaysRecord();
        }

        // Add one to today's extended session count
        this.currentRecord.extendedSessions += 1;
        this.currentRecord.lastUpdated = new Date().toISOString();

        // Save updated record
        const records = this.loadRecords();
        records[today] = this.currentRecord;
        this.saveRecords(records);

        console.log(`Added an extended session. Total today: ${this.currentRecord.extendedSessions} sessions`);

        return this.currentRecord.extendedSessions;
    }

    /**
     * Get today's total working minutes
     */
    getTodaysTime() {
        const today = this.getTodaysDate();

        // Check if we need to switch to a new day
        if (this.currentRecord.date !== today) {
            this.currentRecord = this.loadTodaysRecord();
        }

        return this.currentRecord.workingMinutes;
    }

    /**
     * Get today's extended sessions count
     */
    getTodaysExtendedSessions() {
        const today = this.getTodaysDate();

        // Check if we need to switch to a new day
        if (this.currentRecord.date !== today) {
            this.currentRecord = this.loadTodaysRecord();
        }

        return this.currentRecord.extendedSessions;
    }

    /**
     * Get today's complete record
     */
    getTodaysRecord() {
        const today = this.getTodaysDate();

        // Check if we need to switch to a new day
        if (this.currentRecord.date !== today) {
            this.currentRecord = this.loadTodaysRecord();
        }

        return { ...this.currentRecord };
    }

    /**
     * Get working time for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     */
    getTimeForDate(date) {
        const records = this.loadRecords();
        return records[date] ? records[date].workingMinutes : 0;
    }

    /**
     * Get records for the last N days
     * @param {number} days - Number of days to retrieve (default: 7)
     */
    getRecentRecords(days = 7) {
        const records = this.loadRecords();
        const result = [];

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            // Use local timezone instead of UTC
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            result.push({
                date: dateStr,
                workingMinutes: records[dateStr] ? records[dateStr].workingMinutes : 0,
                extendedSessions: records[dateStr] ? records[dateStr].extendedSessions : 0
            });
        }

        return result.reverse(); // Return in chronological order
    }

    /**
     * Get total working time for the current week
     */
    getWeeklyTotal() {
        const weekRecords = this.getRecentRecords(7);
        return weekRecords.reduce((total, record) => total + record.workingMinutes, 0);
    }

    /**
     * Get all records
     */
    getAllRecords() {
        return this.loadRecords();
    }

    /**
     * Reset today's time (for testing purposes)
     */
    resetToday() {
        const today = this.getTodaysDate();
        const records = this.loadRecords();

        records[today] = {
            date: today,
            workingMinutes: 0,
            extendedSessions: 0,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        this.saveRecords(records);
        this.currentRecord = records[today];

        console.log('Today\'s record has been reset to 0 minutes');
        return this.currentRecord;
    }

    getLastUpdatedTime() {
        return this.loadFile()?.lastUpdatedAt || null;
    }
}

// Create a singleton instance
let instance = null;

function getTimeRecorder(userDataPath = null) {
    if (!instance) {
        instance = new TimeRecorder(userDataPath);
    }
    return instance;
}

// Export the singleton instance and methods
module.exports = getTimeRecorder;
