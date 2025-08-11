// Theme setting storage - now uses SettingsManager for unified storage
const SettingsManager = require('./settingsManager');

// Create a singleton instance to avoid conflicts
let settingsManager = null;

function getSettingsManager() {
    if (!settingsManager) {
        settingsManager = new SettingsManager();
    }
    return settingsManager;
}

function saveTheme(theme) {
    console.log(`Saving theme: ${theme}`);
    return getSettingsManager().saveTheme(theme);
}

function loadTheme() {
    return getSettingsManager().loadTheme();
}

function sendThemeToRenderer(mainWindow) {
    return getSettingsManager().sendThemeToRenderer(mainWindow);
}

module.exports = {
  saveTheme,
  loadTheme,
  sendThemeToRenderer,
};