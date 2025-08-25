# Webpack + Asar Build Process

This document describes the updated build process for Worthier Desktop that now uses webpack for bundling followed by asar packaging.

## Overview

The new build process consists of:
1. **React Apps Build** - Build all React applications (main, notification, rest)
2. **Webpack Bundling** - Bundle all Electron main process files using webpack
3. **Electron Builder** - Package the bundled files with asar compression

## Build Flow

```
React Build → Webpack Bundle → Electron Builder (with asar)
```

## Files Modified/Added

### New Files:
- `webpack.config.js` - Webpack configuration for bundling Electron files

### Modified Files:
- `build.js` - Updated to include webpack bundling step
- `main.js` - Fixed electron import (from `electron/main` to `electron`)
- `package.json` - Added webpack dependencies and build script
- `.gitignore` - Added `dist-webpack/` to ignore list

## Scripts

- `npm run build:webpack` - Run only webpack bundling
- `npm run build` - Full build process (React + Webpack + Electron Builder) - builds both x64 and arm64
- `npm run build:x64` - Build x64 architecture only (~119MB DMG)
- `npm run build:arm64` - Build arm64 architecture only (~114MB DMG)
- `npm run build:react` - Build only React apps

## Architecture-Specific Builds

The build system now supports separate architecture builds to reduce app size:

### Universal Binary (Default)
- File: `Worthier Desktop-1.0.0-universal.dmg`
- Size: ~230MB (contains both x64 and arm64 code)
- Command: `npm run build`

### x64 Only (Intel Macs)
- File: `Worthier Desktop-1.0.0.dmg`
- Size: ~119MB (50% smaller)
- Command: `npm run build:x64`

### arm64 Only (Apple Silicon Macs)
- File: `Worthier Desktop-1.0.0-arm64.dmg`
- Size: ~114MB (50% smaller)
- Command: `npm run build:arm64`

The architecture-specific builds use separate configuration files (`electron-builder-x64.json` and `electron-builder-arm64.json`) to ensure only the target architecture is built.

## Output Directories

- `react/dist/`, `notification-react/dist/`, `rest-react/dist/` - React build outputs
- `dist-webpack/` - Webpack bundled files (temporary)
- `dist/` - Final Electron application packages (DMG files only)

## Benefits

1. **Code Bundling** - All JavaScript files are bundled and minified
2. **Asar Packaging** - Application files are packaged into a single asar archive
3. **Smaller File Size** - Webpack optimization reduces bundle size
4. **Better Performance** - Faster startup due to bundled files
5. **Native Module Support** - Native modules (keytar) are properly unpacked
6. **DMG Only Distribution** - Clean distribution with only DMG files (no zip archives)

## Technical Details

- **Webpack Targets**: `electron-main` for main process, `electron-preload` for preload scripts
- **Externals**: Native modules (keytar) and Node.js built-ins are marked as external
- **Asar Unpacking**: Native binaries (*.node, *.dll) are unpacked for proper execution
- **Copy Operations**: Static assets (icons, certificates, React builds) are copied to the bundle
- **Output Format**: Only DMG files are generated (zip archives removed for cleaner distribution)
