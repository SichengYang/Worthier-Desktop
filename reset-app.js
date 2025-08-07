#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

async function resetApp() {
    console.log('🔄 Resetting Worthier Desktop App for fresh testing...\n');

    try {
        // Reset TCC permissions for the app
        console.log('1. Resetting app permissions...');
        try {
            await execAsync('tccutil reset All com.worthier.app');
            console.log('   ✅ App permissions reset successfully');
        } catch (error) {
            console.log('   ⚠️  Permission reset failed (this is normal if app hasn\'t been granted permissions yet)');
            console.log('   Error:', error.message);
        }

        // Remove settings file
        console.log('\n2. Removing app settings...');
        const settingsPath = path.join(process.env.HOME, 'Library', 'Application Support', 'worthier-desktop', 'app-settings.json');
        
        try {
            if (fs.existsSync(settingsPath)) {
                fs.unlinkSync(settingsPath);
                console.log('   ✅ Settings file removed:', settingsPath);
            } else {
                console.log('   ℹ️  Settings file doesn\'t exist (already clean)');
            }
        } catch (error) {
            console.log('   ❌ Failed to remove settings file:', error.message);
        }

        // Remove theme settings file
        console.log('\n3. Removing theme settings...');
        const themeConfigPath = path.join(process.env.HOME, 'Library', 'Application Support', 'worthier-desktop', 'theme-config.json');
        
        try {
            if (fs.existsSync(themeConfigPath)) {
                fs.unlinkSync(themeConfigPath);
                console.log('   ✅ Theme config file removed:', themeConfigPath);
            } else {
                console.log('   ℹ️  Theme config file doesn\'t exist (already clean)');
            }
        } catch (error) {
            console.log('   ❌ Failed to remove theme config file:', error.message);
        }

        console.log('\n🎉 App reset complete! The app will start with:');
        console.log('   • No saved permissions (will prompt when needed)');
        console.log('   • Default settings (timer, notifications, etc.)');
        console.log('   • Default theme (will auto-detect system theme)');
        console.log('   • Fresh permission dialogs when features are enabled\n');
        
        console.log('💡 You can now test your app with a completely clean state.');

    } catch (error) {
        console.error('❌ Reset failed:', error.message);
        process.exit(1);
    }
}

// Run the reset
resetApp();
