import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'formdata-polyfill': path.resolve(__dirname, './formdata-mock.js'),
      'formdata-polyfill/esm.min.js': path.resolve(__dirname, './formdata-mock.js'),
    }
  },
  build: {
    outDir: 'dist'
  },
});