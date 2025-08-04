// Theme setting storage
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const themeConfigPath = path.join(app.getPath('userData'), 'theme-config.json');

function saveTheme(theme) {
    console.log(`Saving theme: ${theme}`);
    fs.writeFileSync(themeConfigPath, JSON.stringify({ theme }), 'utf-8');
}

function loadTheme() {
  try {
    const data = fs.readFileSync(themeConfigPath, 'utf-8');
    const theme = JSON.parse(data).theme;
    console.log(`Loaded theme: ${theme}`);
    if (theme === 'system' || !theme) {
      // Detect system theme
      const { nativeTheme } = require('electron');
      const isDark = nativeTheme.shouldUseDarkColors;
      return isDark ? 'dark' : 'light';
    }
    return theme;
  } catch (error) {
    console.log('No user setting found, detecting system theme');
    // No user setting, detect system theme
    const { nativeTheme } = require('electron');
    const isDark = nativeTheme.shouldUseDarkColors;
    return isDark ? 'dark' : 'light';
  }
}

function sendThemeToRenderer(mainWindow) {
  if (mainWindow && mainWindow.webContents) {
    const currentTheme = loadTheme();
    console.log(`Sending theme to renderer: ${currentTheme}`);
    mainWindow.webContents.send('theme-changed', currentTheme);
  }
}

module.exports = {
  saveTheme,
  loadTheme,
  sendThemeToRenderer,
};