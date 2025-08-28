
require('dotenv').config();
const { spawnSync } = require('child_process');
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