import {privateShellPwa} from '../tooling/pwa.ts';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  publicDir: false,
  base: process.env.VITE_BASE_PATH || './',
  plugins: [react(), tailwindcss(), privateShellPwa()],
  server: {
    port: 3000,
    host: true
  }
});
