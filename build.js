
const { execSync } = require('child_process');

const args = process.argv.slice(2);

if (args[0] === 'react') {
  // Only build React
  try {
    console.log('▶ Building React app...');
    execSync('npm run build', { cwd: './react', stdio: 'inherit' });
    console.log('✔ React app built successfully.');
  } catch (error) {
    console.error('✖ React build failed:', error);
    process.exit(1);
  }
  process.exit(0);
}

try {
  // Run React build first
  console.log('▶ Building React app...');
  execSync('npm run build', { cwd: './react', stdio: 'inherit' });

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
  console.error('✖ React build failed:', error);
}
