import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: path.resolve(dir, 'node_modules/buffer/index.js'),
      events: path.resolve(dir, 'node_modules/events/events.js'),
      'midnightbet-dapp': path.resolve(dir, '../dapp/src/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['object-inspect', 'buffer', 'events'],
    exclude: [
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/onchain-runtime-v3',
    ],
  },
  build: {
    target: 'esnext',
  },
  server: {
    port: 3000,
    host: true,
    fs: { allow: [path.resolve(dir, '..')] },
    proxy: {
      '/prove': { target: 'http://localhost:6300', changeOrigin: true },
    },
  },
  preview: {
    port: 3000,
    host: true,
  },
});
