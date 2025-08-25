const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = [
  // Main process configuration
  {
    mode: 'production',
    target: 'electron-main',
    entry: './main.js',
    output: {
      path: path.resolve(__dirname, 'dist-webpack'),
      filename: 'main.js'
    },
    node: {
      __dirname: false,
      __filename: false
    },
    externals: {
      'keytar': 'commonjs keytar'
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          // Copy package.json
          { from: 'package.json', to: 'package.json' },
          // Copy built React apps
          { from: 'react/dist', to: 'react/dist' },
          { from: 'notification-react/dist', to: 'notification-react/dist' },
          { from: 'rest-react/dist', to: 'rest-react/dist' },
          // Copy preload scripts
          { from: 'preload.js', to: 'preload.js' },
          { from: 'restPreload.js', to: 'restPreload.js' },
          { from: 'notificationPreload.js', to: 'notificationPreload.js' },
          // Copy icons
          { from: 'icon.icns', to: 'icon.icns' },
          { from: 'icon.png', to: 'icon.png' },
          { from: 'iconTemplate.png', to: 'iconTemplate.png' },
          // Copy certificates and entitlements
          { from: 'developerID_application.cer', to: 'developerID_application.cer' },
          { from: 'distribution.cer', to: 'distribution.cer' },
          { from: 'entitlements.*.plist', to: '[name][ext]' },
        ]
      })
    ]
  },
  // Preload scripts configuration
  {
    mode: 'production',
    target: 'electron-preload',
    entry: {
      preload: './preload.js',
      restPreload: './restPreload.js',
      notificationPreload: './notificationPreload.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist-webpack'),
      filename: '[name].js'
    },
    node: {
      __dirname: false,
      __filename: false
    }
  },
  // Other main process modules
  {
    mode: 'production',
    target: 'electron-main',
    entry: {
      'autologin': './autologin.js',
      'deviceInfoManager': './deviceInfoManager.js',
      'getDeviceList': './getDeviceList.js',
      'ipcHandlers': './ipcHandlers.js',
      'login': './login.js',
      'notificationHandlers': './notificationHandlers.js',
      'notificationHelper': './notificationHelper.js',
      'notificationManager': './notificationManager.js',
      'notificationWindow': './notificationWindow.js',
      'recordTime': './recordTime.js',
      'restWindow': './restWindow.js',
      'settingsManager': './settingsManager.js',
      'singleInstance': './singleInstance.js',
      'startAtLogin': './startAtLogin.js',
      'theme': './theme.js',
      'timer': './timer.js',
      'tokenManager': './tokenManager.js',
      'trayWindow': './trayWindow.js',
      'uploadWorkingLog': './uploadWorkingLog.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist-webpack'),
      filename: '[name].js',
      libraryTarget: 'commonjs2'
    },
    node: {
      __dirname: false,
      __filename: false
    },
    externals: {
      'keytar': 'commonjs keytar',
      'axios': 'commonjs axios',
      'electron': 'commonjs electron'
    }
  }
];
