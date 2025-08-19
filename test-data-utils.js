const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Clear test data and restore only recent records
 */
function clearTestData() {
    const recordsPath = path.join(os.homedir(), 'Library/Application Support/worthier-desktop/records.json');
    
    console.log('Records path:', recordsPath);
    
    if (!fs.existsSync(recordsPath)) {
        console.log('No records file found.');
        return;
    }
    
    try {
        const fileContent = fs.readFileSync(recordsPath, 'utf8');
        const allRecords = JSON.parse(fileContent);
        
        // Keep only the last 7 days of real data
        const today = new Date();
        const keepRecords = {};
        const cutoffDate = new Date(today);
        cutoffDate.setDate(today.getDate() - 7);
        
        Object.keys(allRecords).forEach(dateKey => {
            const [year, month, day] = dateKey.split('-').map(Number);
            const recordDate = new Date(year, month - 1, day);
            
            // Keep records from the last 7 days
            if (recordDate >= cutoffDate) {
                keepRecords[dateKey] = allRecords[dateKey];
            }
        });
        
        // Save the cleaned data
        fs.writeFileSync(recordsPath, JSON.stringify(keepRecords, null, 2));
        
        console.log(`✅ Cleared test data. Kept ${Object.keys(keepRecords).length} recent records.`);
        
    } catch (error) {
        console.error('❌ Failed to clear test data:', error);
    }
}

/**
 * Backup current records
 */
function backupRecords() {
    const recordsPath = path.join(os.homedir(), 'Library/Application Support/worthier-desktop/records.json');
    const backupPath = path.join(os.homedir(), 'Library/Application Support/worthier-desktop/records-backup.json');
    
    if (fs.existsSync(recordsPath)) {
        fs.copyFileSync(recordsPath, backupPath);
        console.log('✅ Backup created at:', backupPath);
    } else {
        console.log('No records file to backup.');
    }
}

/**
 * Restore from backup
 */
function restoreFromBackup() {
    const recordsPath = path.join(os.homedir(), 'Library/Application Support/worthier-desktop/records.json');
    const backupPath = path.join(os.homedir(), 'Library/Application Support/worthier-desktop/records-backup.json');
    
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, recordsPath);
        console.log('✅ Restored from backup.');
    } else {
        console.log('No backup file found.');
    }
}

// Command line interface
const command = process.argv[2];

switch (command) {
    case 'clear':
        clearTestData();
        break;
    case 'backup':
        backupRecords();
        break;
    case 'restore':
        restoreFromBackup();
        break;
    default:
        console.log('Usage:');
        console.log('  node test-data-utils.js backup   - Create a backup of current records');
        console.log('  node test-data-utils.js clear    - Clear test data, keep only last 7 days');
        console.log('  node test-data-utils.js restore  - Restore from backup');
        break;
}

module.exports = { clearTestData, backupRecords, restoreFromBackup };
