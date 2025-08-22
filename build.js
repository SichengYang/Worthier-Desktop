
require('dotenv').config();
const { spawnSync } = require('child_process');
const webpack = require('webpack');
const config = require('./webpack.config.js');
const path = require('path');

const args = process.argv.slice(2);
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runCommand(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { 
    cwd, 
    stdio: 'inherit',
    shell: false,
    env 
  });
  
  if (result.error) {
    throw result.error;
  }
  
  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}`);
  }
}

function runWebpack() {
  return new Promise((resolve, reject) => {
    console.log('▶ Running webpack bundling...');
    const compiler = webpack(config);
    
    compiler.run((err, stats) => {
      if (err || stats.hasErrors()) {
        const errorDetails = err ? err.message : stats.compilation.errors.map(e => e.message).join('\n');
        console.error('✖ Webpack bundling failed:', errorDetails);
        reject(new Error('Webpack bundling failed'));
      } else {
        console.log('✔ Webpack bundling completed successfully.');
        resolve();
      }
    });
  });
}

if (args[0] === 'react') {
  // Only build React
  try {
    console.log('▶ Building React app...');
    runCommand(npmCmd, ['run', 'build'], './react');
    console.log('✔ React app built successfully.');
  } catch (error) {
    console.error('✖ React build failed:', error);
    process.exit(1);
  }

  try {
    console.log('▶ Building notification-react app...');
    runCommand(npmCmd, ['run', 'build'], './notification-react');
    console.log('✔ Notification-react app built successfully.');
  } catch (error) {
    console.error('✖ Notification-react build failed:', error);
    process.exit(1);
  }

  try {
    console.log('▶ Building rest-react app...');
    runCommand(npmCmd, ['run', 'build'], './rest-react');
    console.log('✔ Rest-react app built successfully.');
  } catch (error) {
    console.error('✖ Rest-react build failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

async function buildElectron() {
  try {
    // Clean dist directory for architecture-specific builds
    if (args.includes('--x64') || args.includes('--arm64')) {
      console.log('▶ Cleaning dist directory...');
      const fs = require('fs');
      if (fs.existsSync('./dist')) {
        fs.rmSync('./dist', { recursive: true, force: true });
      }
    }
    
    // Run React build first
    console.log('▶ Building React app...');
    runCommand(npmCmd, ['run', 'build'], './react');

    // Build notification-react app
    console.log('▶ Building notification-react app...');
    runCommand(npmCmd, ['run', 'build'], './notification-react');

    // Build rest-react app
    console.log('▶ Building rest-react app...');
    runCommand(npmCmd, ['run', 'build'], './rest-react');

    // Run webpack bundling
    await runWebpack();

    console.log('▶ Building Electron app with bundled files...');
    
    // Determine config file based on architecture and signing options
    let configFile = null;
    let buildDescription = '';
    
    if (args.includes('--x64')) {
      if (args.includes('--notarized')) {
        configFile = 'electron-builder-x64-notarized.json';
        buildDescription = '▶ Building for x64 architecture with notarization';
      } else if (args.includes('--signed')) {
        configFile = 'electron-builder-x64-signed.json';
        buildDescription = '▶ Building for x64 architecture with code signing';
      } else {
        configFile = 'electron-builder-x64.json';
        buildDescription = '▶ Building for x64 architecture only';
      }
    } else if (args.includes('--arm64')) {
      if (args.includes('--notarized')) {
        configFile = 'electron-builder-arm64-notarized.json';
        buildDescription = '▶ Building for arm64 architecture with notarization';
      } else if (args.includes('--signed')) {
        configFile = 'electron-builder-arm64-signed.json';
        buildDescription = '▶ Building for arm64 architecture with code signing';
      } else {
        configFile = 'electron-builder-arm64.json';
        buildDescription = '▶ Building for arm64 architecture only';
      }
    } else {
      buildDescription = '▶ Building for both x64 and arm64 architectures';
      
      if (args.includes('--notarized')) {
        buildDescription += ' with notarization';
      } else if (args.includes('--signed')) {
        buildDescription += ' with code signing';
      }
    }
    
    console.log(buildDescription);
    
    // Set up environment variables for signing
    const env = { ...process.env };
    
    // Enable verbose logging for code signing
    env.DEBUG = 'electron-builder,electron-notarize*';
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'; // Disable auto discovery to see prompts
    
    if (args.includes('--signed') || args.includes('--notarized')) {
      // Load environment variables from .env
      require('dotenv').config();
      
      if (process.env.DEVELOPER_ID_CSC_NAME) {
        env.CSC_NAME = process.env.DEVELOPER_ID_CSC_NAME;
        console.log(`▶ Using certificate: ${process.env.DEVELOPER_ID_CSC_NAME}`);
      }
      
      if (args.includes('--notarized')) {
        if (process.env.APPLE_API_KEY) {
          env.APPLE_API_KEY = process.env.APPLE_API_KEY;
          console.log(`▶ Apple API Key: ${process.env.APPLE_API_KEY}`);
        }
        if (process.env.APPLE_API_KEY_ID) {
          env.APPLE_API_KEY_ID = process.env.APPLE_API_KEY_ID;
          console.log(`▶ Apple API Key ID: ${process.env.APPLE_API_KEY_ID}`);
        }
        if (process.env.APPLE_API_ISSUER) {
          env.APPLE_API_ISSUER = process.env.APPLE_API_ISSUER;
          console.log(`▶ Apple API Issuer: ${process.env.APPLE_API_ISSUER}`);
        }
        if (process.env.APPLE_TEAM_ID) {
          env.APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
          console.log(`▶ Apple Team ID: ${process.env.APPLE_TEAM_ID}`);
        }
        console.log('▶ Starting notarization process...');
      }
      
      // Enable verbose signing and debugging
      env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
      env.DEBUG = 'electron-builder';
    }
    
    if (configFile) {
      // Use specific config file for architecture-specific builds
      runCommand('npx', ['electron-builder', '--config', configFile], '.', env);
    } else {
      // Use the programmatic API for the default build
      const builder = require('electron-builder');
      const baseConfig = {
        ...require('./package.json').build,
        directories: {
          output: "dist",
          buildResources: "dist-webpack"
        },
        files: [
          {
            from: "dist-webpack",
            to: ".",
            filter: ["**/*"]
          }
        ],
        asarUnpack: "**/*.{node,dll}"
      };
      
      // Override mac config for signing/notarization
      if (args.includes('--signed') || args.includes('--notarized')) {
        baseConfig.mac = {
          ...baseConfig.mac,
          hardenedRuntime: true,
          gatekeeperAssess: true,
          entitlements: "entitlements.plist",
          entitlementsInherit: "entitlements.plist"
        };
        
        if (args.includes('--notarized')) {
          baseConfig.mac.notarize = {
            teamId: process.env.APPLE_TEAM_ID
          };
        }
      }

      // Set environment variables for the programmatic build
      Object.assign(process.env, env);

      // Determine target based on command line argument
      let target = undefined;
      
      if (args.includes('--mac')) {
        target = 'mac';
      } else if (args.includes('--mas')) {
        target = 'mas';
      } else if (args.includes('--win')) {
        target = 'win';
      }

      const buildOptions = { config: baseConfig };
      
      if (target) {
        buildOptions.targets = builder.Platform.MAC.createTarget(target);
      }

      await builder.build(buildOptions);
    }
    
    console.log('✔ App built successfully with webpack bundling and asar packaging.');
  } catch (error) {
    console.error('✖ Build failed:', error);
    process.exit(1);
  }
}

buildElectron();
