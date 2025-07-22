require('dotenv').config();
const { execSync } = require('child_process');
const builder = require('electron-builder');

try {
  // Run React build first
  console.log('▶ Building React app...');
  execSync('npm run build', { cwd: './react', stdio: 'inherit' });

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
