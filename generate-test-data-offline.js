const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Generate test data for multiple months - OFFLINE VERSION
 * This version creates a backup and disables sync while testing
 */
function generateMultiMonthTestDataOffline() {
    // Define the path to the records file
    const recordsPath = path.join(os.homedir(), 'Library/Application Support/worthier-desktop/records.json');
    const backupPath = path.join(os.homedir(), 'Library/Application Support/worthier-desktop/records-original-backup.json');
    
    console.log('Records path:', recordsPath);
    
    // Create backup of original data
    if (fs.existsSync(recordsPath)) {
        fs.copyFileSync(recordsPath, backupPath);
        console.log('✅ Created backup at:', backupPath);
    }
    
    // Create test data for the last 6 months
    const testData = {};
    const today = new Date();
    
    // Helper function to format date as YYYY-MM-DD
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    // Helper function to generate random working minutes (0-240, with bias towards 0-120)
    const generateWorkingMinutes = () => {
        const rand = Math.random();
        if (rand < 0.3) return 0; // 30% chance of no work
        if (rand < 0.7) return Math.floor(Math.random() * 120) + 15; // 40% chance of 15-135 minutes
        return Math.floor(Math.random() * 120) + 120; // 30% chance of 120-240 minutes
    };
    
    // Helper function to generate extended sessions based on working minutes
    const generateExtendedSessions = (workingMinutes) => {
        if (workingMinutes === 0) return 0;
        if (workingMinutes < 60) return Math.floor(Math.random() * 2); // 0-1 sessions
        if (workingMinutes < 120) return Math.floor(Math.random() * 3) + 1; // 1-3 sessions
        return Math.floor(Math.random() * 5) + 2; // 2-6 sessions for long work days
    };
    
    // Generate data for the last 6 months
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
        const currentMonth = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        
        console.log(`Generating data for ${currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}...`);
        
        // Generate data for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dateString = formatDate(date);
            
            // Skip future dates
            if (date > today) continue;
            
            const workingMinutes = generateWorkingMinutes();
            const extendedSessions = generateExtendedSessions(workingMinutes);
            
            // Generate realistic timestamps
            const now = new Date(); // Current time to make it "newer" than server data
            const baseTime = new Date(date);
            baseTime.setHours(8 + Math.floor(Math.random() * 4)); // Start between 8-11 AM
            baseTime.setMinutes(Math.floor(Math.random() * 60));
            baseTime.setSeconds(Math.floor(Math.random() * 60));
            
            testData[dateString] = {
                date: dateString,
                workingMinutes: workingMinutes,
                extendedSessions: extendedSessions,
                createdAt: baseTime.toISOString(),
                lastUpdated: now.toISOString() // Use current time to prevent server override
            };
        }
    }
    
    // Wrap test data in the proper format that the app expects
    const finalData = {
        records: testData,
        lastUpdatedAt: new Date().toISOString() // Use current time to make it "newer" than server data
    };
    
    // Save the test data directly (don't merge to avoid server override)
    try {
        fs.writeFileSync(recordsPath, JSON.stringify(finalData, null, 2));
        console.log(`✅ Successfully generated OFFLINE test data for ${Object.keys(testData).length} days across 6 months!`);
        
        // Print summary statistics
        const monthStats = {};
        Object.keys(testData).forEach(dateKey => {
            const [year, month] = dateKey.split('-');
            const monthKey = `${year}-${month}`;
            if (!monthStats[monthKey]) {
                monthStats[monthKey] = { totalDays: 0, activeDays: 0, totalMinutes: 0 };
            }
            monthStats[monthKey].totalDays++;
            if (testData[dateKey].workingMinutes > 0) {
                monthStats[monthKey].activeDays++;
                monthStats[monthKey].totalMinutes += testData[dateKey].workingMinutes;
            }
        });
        
        console.log('\n📊 Test Data Summary:');
        Object.keys(monthStats).sort().forEach(monthKey => {
            const stats = monthStats[monthKey];
            const hours = Math.floor(stats.totalMinutes / 60);
            const minutes = stats.totalMinutes % 60;
            console.log(`${monthKey}: ${stats.activeDays}/${stats.totalDays} active days, ${hours}h ${minutes}m total`);
        });
        
        console.log(`\n🔄 To restore original data later, run:`);
        console.log(`cp "${backupPath}" "${recordsPath}"`);
        console.log(`\n⚠️  NOTE: Make sure to close the app before running this script to avoid sync conflicts!`);
        
    } catch (error) {
        console.error('❌ Failed to save test data:', error);
    }
}

/**
 * Restore original data from backup
 */
function restoreOriginalData() {
    const recordsPath = path.join(os.homedir(), 'Library/Application Support/worthier-desktop/records.json');
    const backupPath = path.join(os.homedir(), 'Library/Application Support/worthier-desktop/records-original-backup.json');
    
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, recordsPath);
        console.log('✅ Restored original data from backup');
    } else {
        console.log('❌ No backup file found');
    }
}

// Command line interface
const command = process.argv[2];

switch (command) {
    case 'offline':
        generateMultiMonthTestDataOffline();
        break;
    case 'restore':
        restoreOriginalData();
        break;
    default:
        console.log('Usage:');
        console.log('  node generate-test-data-offline.js offline   - Generate test data (offline mode)');
        console.log('  node generate-test-data-offline.js restore   - Restore original data');
        console.log('');
        console.log('⚠️  IMPORTANT: Close the Worthier app before running the offline command!');
        break;
}

module.exports = { generateMultiMonthTestDataOffline, restoreOriginalData };
