import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // Generate hashes for CSP nonces in production
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        tray: path.resolve(__dirname, 'tray.html')
      }
    }
  },
  // For development, we need to allow inline styles and scripts
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws: wss:;"
    }
  }
});
