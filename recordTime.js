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

    /**
     * Parse date string into components
     * @param {string} dateStr - Date in YYYY-MM-DD format
     */
    parseDateString(dateStr) {
        const parts = dateStr.split('-');
        return {
            year: parts[0],
            month: parseInt(parts[1], 10),
            day: parseInt(parts[2], 10),
            dateStr: dateStr
        };
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
     * Get or create year/month structure in records
     * @param {Object} records - Records object
     * @param {string} year - Year string
     * @param {number} month - Month number (1-12)
     */
    ensureYearMonthStructure(records, year, month) {
        if (!records[year]) {
            records[year] = {};
        }
        if (!records[year][month]) {
            records[year][month] = {};
        }
        return records;
    }

    /**
     * Get record for a specific date from the new nested structure
     * @param {Object} records - Records object
     * @param {string} dateStr - Date in YYYY-MM-DD format
     */
    getRecordForDate(records, dateStr) {
        const { year, month, day } = this.parseDateString(dateStr);
        return records[year]?.[month]?.[day] || null;
    }

    /**
     * Set record for a specific date in the new nested structure
     * @param {Object} records - Records object
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @param {Object} record - Record object
     */
    setRecordForDate(records, dateStr, record) {
        const { year, month, day } = this.parseDateString(dateStr);
        this.ensureYearMonthStructure(records, year, month);
        
        records[year][month][day] = record;
        return records;
    }

    /**
     * Save records to file
     */
    saveRecords(records, time = null) {
        let storeTime = time === null ? new Date().toISOString() : time;
        let writeJson = {
            records: records,
            lastUpdatedAt: storeTime
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
        let records = this.loadRecords();
        
        const today = this.getTodaysDate();
        let todaysRecord = this.getRecordForDate(records, today);

        if (!todaysRecord) {
            // New day, start from 0
            todaysRecord = {
                workingMinutes: 0,
                extendedSessions: 0,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
            this.setRecordForDate(records, today, todaysRecord);
            this.saveRecords(records);
        }

        return todaysRecord;
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
        let records = this.loadRecords();
        this.setRecordForDate(records, today, this.currentRecord);
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
        let records = this.loadRecords();
        this.setRecordForDate(records, today, this.currentRecord);
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
        let records = this.loadRecords();
        const record = this.getRecordForDate(records, date);
        return record ? record.workingMinutes : 0;
    }

    /**
     * Get records for the last N days
     * @param {number} days - Number of days to retrieve (default: 7)
     */
    getRecentRecords(days = 7) {
        let records = this.loadRecords();
        const result = [];

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            // Use local timezone instead of UTC
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const record = this.getRecordForDate(records, dateStr);
            result.push({
                date: dateStr,
                workingMinutes: record ? record.workingMinutes : 0,
                extendedSessions: record ? record.extendedSessions : 0
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
        let records = this.loadRecords();
        return records;
    }

    /**
     * Reset today's time (for testing purposes)
     */
    resetToday() {
        const today = this.getTodaysDate();
        let records = this.loadRecords();

        const resetRecord = {
            workingMinutes: 0,
            extendedSessions: 0,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        this.setRecordForDate(records, today, resetRecord);
        this.saveRecords(records);
        this.currentRecord = resetRecord;

        console.log('Today\'s record has been reset to 0 minutes');
        return this.currentRecord;
    }

    getLastUpdatedTime() {
        return this.loadFile()?.lastUpdatedAt || null;
    }

    /**
     * Reconstruct date string from year, month, day
     * @param {string} year - Year string
     * @param {number} month - Month number (1-12)
     * @param {number} day - Day number (1-31)
     */
    constructDateString(year, month, day) {
        const monthStr = String(month).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        return `${year}-${monthStr}-${dayStr}`;
    }

    /**
     * Get all records for a specific month with reconstructed date strings
     * @param {string} year - Year string (e.g., "2025")
     * @param {number} month - Month number (1-12)
     * @param {boolean} includeDateStrings - Whether to include date strings in records
     */
    getRecordsForMonthWithDates(year, month, includeDateStrings = false) {
        const monthRecords = this.getRecordsForMonth(year, month);
        
        if (!includeDateStrings) {
            return monthRecords;
        }
        
        // Add date strings to records if requested
        const recordsWithDates = {};
        Object.keys(monthRecords).forEach(day => {
            const dateString = this.constructDateString(year, month, parseInt(day));
            recordsWithDates[day] = {
                date: dateString,
                ...monthRecords[day]
            };
        });
        
        return recordsWithDates;
    }

    /**
     * Get all records for a specific year
     * @param {string} year - Year string (e.g., "2025")
     */
    getRecordsForYear(year) {
        let records = this.loadRecords();
        return records[year] || {};
    }

    /**
     * Get all records for a specific month
     * @param {string} year - Year string (e.g., "2025")
     * @param {number} month - Month number (1-12)
     */
    getRecordsForMonth(year, month) {
        let records = this.loadRecords();
        return records[year]?.[month] || {};
    }

    /**
     * Get total working time for a specific month
     * @param {string} year - Year string (e.g., "2025")
     * @param {number} month - Month number (1-12)
     */
    getMonthlyTotal(year, month) {
        const monthRecords = this.getRecordsForMonth(year, month);
        return Object.values(monthRecords).reduce((total, record) => total + (record.workingMinutes || 0), 0);
    }

    /**
     * Get total working time for a specific year
     * @param {string} year - Year string (e.g., "2025")
     */
    getYearlyTotal(year) {
        const yearRecords = this.getRecordsForYear(year);
        let total = 0;
        
        Object.values(yearRecords).forEach(monthRecords => {
            Object.values(monthRecords).forEach(record => {
                total += record.workingMinutes || 0;
            });
        });
        
        return total;
    }

    /**
     * Get available years with data
     */
    getAvailableYears() {
        let records = this.loadRecords();
        
        return Object.keys(records)
            .filter(key => /^\d{4}$/.test(key))
            .sort()
            .reverse(); // Most recent first
    }

    /**
     * Get available months for a specific year
     * @param {string} year - Year string (e.g., "2025")
     */
    getAvailableMonthsForYear(year) {
        const yearRecords = this.getRecordsForYear(year);
        return Object.keys(yearRecords)
            .map(m => parseInt(m, 10))
            .sort((a, b) => a - b);
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
