require('dotenv').config();
const builder = require('electron-builder');

builder.build({
  config: require('./package.json').build
}).then(() => {
  console.log('✔ App built successfully.');
}).catch((error) => {
  console.error('✖ Build failed:', error);
});
