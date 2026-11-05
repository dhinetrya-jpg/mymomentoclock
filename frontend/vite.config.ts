import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  publicDir: false,
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true
  }
});
