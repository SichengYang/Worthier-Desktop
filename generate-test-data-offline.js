const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Generate test data for multiple months - OFFLINE VERSION
 * This version creates a backup and disables sync while testing
 * Updated to use the new year/month nested structure
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
    
    // Create test data for the last 6 months using new nested structure
    const testData = {};
    const today = new Date();
    
    // Helper function to format date as YYYY-MM-DD
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper function to ensure year/month structure exists
    const ensureYearMonthStructure = (data, year, month) => {
        if (!data[year]) {
            data[year] = {};
        }
        if (!data[year][month]) {
            data[year][month] = {};
        }
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
            
            // Use new nested structure: year -> month -> day
            const year = date.getFullYear().toString();
            const month = date.getMonth() + 1; // 1-12
            const dayOfMonth = date.getDate(); // 1-31
            
            ensureYearMonthStructure(testData, year, month);
            
            testData[year][month][dayOfMonth] = {
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
        
        // Count total days generated
        let totalDays = 0;
        Object.keys(testData).forEach(year => {
            Object.keys(testData[year]).forEach(month => {
                totalDays += Object.keys(testData[year][month]).length;
            });
        });
        
        console.log(`✅ Successfully generated OFFLINE test data for ${totalDays} days across 6 months in new nested structure!`);
        
        // Print summary statistics
        const monthStats = {};
        Object.keys(testData).forEach(year => {
            Object.keys(testData[year]).forEach(month => {
                const monthRecords = testData[year][month];
                const monthKey = `${year}-${String(month).padStart(2, '0')}`;
                
                if (!monthStats[monthKey]) {
                    monthStats[monthKey] = { totalDays: 0, activeDays: 0, totalMinutes: 0 };
                }
                
                Object.keys(monthRecords).forEach(day => {
                    const record = monthRecords[day];
                    monthStats[monthKey].totalDays++;
                    if (record.workingMinutes > 0) {
                        monthStats[monthKey].activeDays++;
                        monthStats[monthKey].totalMinutes += record.workingMinutes;
                    }
                });
            });
        });
        
        console.log('\n📊 Test Data Summary (New Structure):');
        Object.keys(monthStats).sort().forEach(monthKey => {
            const stats = monthStats[monthKey];
            const hours = Math.floor(stats.totalMinutes / 60);
            const minutes = stats.totalMinutes % 60;
            console.log(`${monthKey}: ${stats.activeDays}/${stats.totalDays} active days, ${hours}h ${minutes}m total`);
        });
        
        console.log('\n🏗️  Data Structure Preview:');
        console.log('New format: { "year": { "month": { "YYYY-MM-DD": { record } } } }');
        console.log('Available years:', Object.keys(testData).sort());
        Object.keys(testData).forEach(year => {
            console.log(`  ${year}: months ${Object.keys(testData[year]).sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}`);
        });
        
        console.log(`\n🔄 To restore original data later, run:`);
        console.log(`cp "${backupPath}" "${recordsPath}"`);
        console.log(`\n⚠️  NOTE: Make sure to close the app before running this script to avoid sync conflicts!`);
        
    } catch (error) {
        console.error('❌ Failed to save test data:', error);
    }
}

/**
 * Generate comprehensive test data with fine control over the new structure
 * This version allows specifying years, months, and data density
 */
function generateComprehensiveTestData(options = {}) {
    const {
        startYear = 2023,
        endYear = 2025,
        months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // All months by default
        workDensity = 0.7, // 70% of days have work
        averageMinutesPerDay = 120,
        includeWeekends = false
    } = options;

    const recordsPath = path.join(os.homedir(), 'Library/Application Support/worthier-desktop/records.json');
    const backupPath = path.join(os.homedir(), 'Library/Application Support/worthier-desktop/records-comprehensive-backup.json');
    
    console.log('Generating comprehensive test data with new structure...');
    console.log(`Years: ${startYear}-${endYear}`);
    console.log(`Months: ${months.join(', ')}`);
    console.log(`Work density: ${Math.round(workDensity * 100)}%`);
    
    // Create backup
    if (fs.existsSync(recordsPath)) {
        fs.copyFileSync(recordsPath, backupPath);
        console.log('✅ Created comprehensive backup');
    }

    const testData = {};

    // Helper functions
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const ensureYearMonthStructure = (data, year, month) => {
        if (!data[year]) {
            data[year] = {};
        }
        if (!data[year][month]) {
            data[year][month] = {};
        }
    };

    const isWeekend = (date) => {
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    };

    const generateVariableMinutes = (baseMinutes) => {
        // Add some randomness to the base minutes
        const variation = 0.4; // 40% variation
        const min = baseMinutes * (1 - variation);
        const max = baseMinutes * (1 + variation);
        return Math.floor(Math.random() * (max - min) + min);
    };

    let totalDaysGenerated = 0;

    // Generate data for specified years and months
    for (let year = startYear; year <= endYear; year++) {
        const yearStr = year.toString();
        
        months.forEach(month => {
            console.log(`Generating ${year}-${String(month).padStart(2, '0')}...`);
            
            const daysInMonth = new Date(year, month, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month - 1, day);
                const dateString = formatDate(date);
                
                // Skip future dates
                if (date > new Date()) continue;
                
                // Skip weekends if not included
                if (!includeWeekends && isWeekend(date)) continue;
                
                // Determine if this day should have work based on density
                const hasWork = Math.random() < workDensity;
                
                if (hasWork || Math.random() < 0.1) { // Always include 10% of non-work days for variety
                    const workingMinutes = hasWork ? generateVariableMinutes(averageMinutesPerDay) : 0;
                    const extendedSessions = hasWork ? Math.max(0, Math.floor(workingMinutes / 45) + Math.floor(Math.random() * 2)) : 0;
                    
                    // Generate timestamps
                    const baseTime = new Date(date);
                    baseTime.setHours(8 + Math.floor(Math.random() * 4));
                    baseTime.setMinutes(Math.floor(Math.random() * 60));
                    
                    const lastUpdated = new Date(date);
                    lastUpdated.setHours(baseTime.getHours() + Math.floor(workingMinutes / 60) + 1);
                    lastUpdated.setMinutes(Math.floor(Math.random() * 60));
                    
                    ensureYearMonthStructure(testData, yearStr, month);
                    
                    testData[yearStr][month][day] = {
                        workingMinutes: workingMinutes,
                        extendedSessions: extendedSessions,
                        createdAt: baseTime.toISOString(),
                        lastUpdated: lastUpdated.toISOString()
                    };
                    
                    totalDaysGenerated++;
                }
            }
        });
    }

    // Save the comprehensive test data
    const finalData = {
        records: testData,
        lastUpdatedAt: new Date().toISOString()
    };

    try {
        fs.writeFileSync(recordsPath, JSON.stringify(finalData, null, 2));
        console.log(`\n✅ Generated comprehensive test data for ${totalDaysGenerated} days!`);
        
        // Print detailed statistics
        console.log('\n📈 Comprehensive Data Statistics:');
        Object.keys(testData).sort().forEach(year => {
            const yearData = testData[year];
            let yearTotal = 0;
            let yearDays = 0;
            
            Object.keys(yearData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(month => {
                const monthData = yearData[month];
                let monthTotal = 0;
                let monthDays = 0;
                
                Object.values(monthData).forEach(record => {
                    monthTotal += record.workingMinutes;
                    monthDays++;
                });
                
                yearTotal += monthTotal;
                yearDays += monthDays;
                
                const monthHours = Math.floor(monthTotal / 60);
                const monthMinutes = monthTotal % 60;
                console.log(`  ${year}-${String(month).padStart(2, '0')}: ${monthDays} days, ${monthHours}h ${monthMinutes}m`);
            });
            
            const yearHours = Math.floor(yearTotal / 60);
            const yearMins = yearTotal % 60;
            console.log(`${year} Total: ${yearDays} days, ${yearHours}h ${yearMins}m\n`);
        });
        
        console.log('🔄 To restore original data:');
        console.log(`cp "${backupPath}" "${recordsPath}"`);
        
    } catch (error) {
        console.error('❌ Failed to save comprehensive test data:', error);
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
    case 'comprehensive':
        // Parse options from command line arguments
        const options = {};
        
        // Look for --year-range=2023-2025
        const yearRangeArg = process.argv.find(arg => arg.startsWith('--year-range='));
        if (yearRangeArg) {
            const [start, end] = yearRangeArg.split('=')[1].split('-').map(Number);
            options.startYear = start;
            options.endYear = end;
        }
        
        // Look for --months=1,2,3,4
        const monthsArg = process.argv.find(arg => arg.startsWith('--months='));
        if (monthsArg) {
            options.months = monthsArg.split('=')[1].split(',').map(Number);
        }
        
        // Look for --density=0.8
        const densityArg = process.argv.find(arg => arg.startsWith('--density='));
        if (densityArg) {
            options.workDensity = parseFloat(densityArg.split('=')[1]);
        }
        
        // Look for --average-minutes=150
        const avgMinutesArg = process.argv.find(arg => arg.startsWith('--average-minutes='));
        if (avgMinutesArg) {
            options.averageMinutesPerDay = parseInt(avgMinutesArg.split('=')[1]);
        }
        
        // Look for --include-weekends
        if (process.argv.includes('--include-weekends')) {
            options.includeWeekends = true;
        }
        
        generateComprehensiveTestData(options);
        break;
    case 'restore':
        restoreOriginalData();
        break;
    default:
        console.log('Usage:');
        console.log('  node generate-test-data-offline.js offline     - Generate test data for last 6 months (offline mode)');
        console.log('  node generate-test-data-offline.js comprehensive [options] - Generate comprehensive test data');
        console.log('  node generate-test-data-offline.js restore     - Restore original data');
        console.log('');
        console.log('Comprehensive options:');
        console.log('  --year-range=2023-2025      Set year range (default: 2023-2025)');
        console.log('  --months=1,2,3,8,9,10       Specify months to generate (default: all months)');
        console.log('  --density=0.7               Set work day density 0.0-1.0 (default: 0.7)');
        console.log('  --average-minutes=120       Set average minutes per work day (default: 120)');
        console.log('  --include-weekends          Include weekends (default: false)');
        console.log('');
        console.log('Examples:');
        console.log('  node generate-test-data-offline.js comprehensive --year-range=2024-2025 --density=0.8');
        console.log('  node generate-test-data-offline.js comprehensive --months=8,9,10,11,12 --include-weekends');
        console.log('');
        console.log('⚠️  IMPORTANT: Close the Worthier app before running data generation commands!');
        break;
}

module.exports = { generateMultiMonthTestDataOffline, generateComprehensiveTestData, restoreOriginalData };
