
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, { 
    cwd, 
    stdio: 'inherit',
    shell: false 
  });
  
  if (result.error) {
    throw result.error;
  }
  
  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}`);
  }
}

if (args[0] === 'react') {
  // Only build React
  try {
    console.log('▶ Building React app...');
    runCommand('npm', ['run', 'build'], './react');
    console.log('✔ React app built successfully.');
  } catch (error) {
    console.error('✖ React build failed:', error);
    process.exit(1);
  }

  try {
    console.log('▶ Building notification-react app...');
    runCommand('npm', ['run', 'build'], './notification-react');
    console.log('✔ Notification-react app built successfully.');
  } catch (error) {
    console.error('✖ Notification-react build failed:', error);
    process.exit(1);
  }

  try {
    console.log('▶ Building rest-react app...');
    runCommand('npm', ['run', 'build'], './rest-react');
    console.log('✔ Rest-react app built successfully.');
  } catch (error) {
    console.error('✖ Rest-react build failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

try {
  // Run React build first
  console.log('▶ Building React app...');
  runCommand('npm', ['run', 'build'], './react');

  // Build notification-react app
  console.log('▶ Building notification-react app...');
  runCommand('npm', ['run', 'build'], './notification-react');

  // Build rest-react app
  console.log('▶ Building rest-react app...');
  runCommand('npm', ['run', 'build'], './rest-react');

  const builder = require('electron-builder');
  // Then run Electron build
  builder.build({
    config: require('./package.json').build
  }).then(() => {
    console.log('✔ App built successfully.');
  }).catch((error) => {
    console.error('✖ Build failed:', error);
  });
} catch (error) {
  console.error('✖ Build failed:', error);
}
