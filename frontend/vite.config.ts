import path from 'node:path';
import { privateShellPwa } from '../tooling/pwa.ts';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  publicDir: false,
  base: process.env.VITE_BASE_PATH || './',
  plugins: [react(), tailwindcss(), privateShellPwa()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
