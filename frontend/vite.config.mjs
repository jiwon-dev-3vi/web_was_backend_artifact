import { defineConfig } from 'vite';
import { publishClient } from './build/publish-client.mjs';

export default defineConfig({
  plugins: [publishClient()],
  build: { outDir: 'dist' },
  server: {
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
