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
    dedupe: [
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/dapp-connector-api',
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/midnight-js',
      '@midnight-ntwrk/midnight-js-contracts',
      '@midnight-ntwrk/midnight-js-network-id',
      '@midnight-ntwrk/midnight-js-protocol',
      '@midnight-ntwrk/midnight-js-types',
      '@midnight-ntwrk/midnight-js-utils',
      '@midnight-ntwrk/onchain-runtime-v3',
      '@midnight-ntwrk/platform-js',
    ],
    alias: [
      {
        find: '@midnight-ntwrk/ledger-v8',
        replacement: path.resolve(dir, '../dapp/node_modules/@midnight-ntwrk/ledger-v8'),
      },
      {
        find: '@midnight-ntwrk/onchain-runtime-v3',
        replacement: path.resolve(dir, '../dapp/node_modules/@midnight-ntwrk/onchain-runtime-v3'),
      },
      {
        find: '@midnight-ntwrk/compact-runtime',
        replacement: path.resolve(dir, '../dapp/node_modules/@midnight-ntwrk/compact-runtime'),
      },
      {
        find: '@midnight-ntwrk/compact-js',
        replacement: path.resolve(dir, '../dapp/node_modules/@midnight-ntwrk/compact-js'),
      },
      {
        find: 'buffer',
        replacement: path.resolve(dir, 'node_modules/buffer/index.js'),
      },
      {
        find: 'events',
        replacement: path.resolve(dir, 'node_modules/events/events.js'),
      },
      {
        find: 'midnightbet-dapp',
        replacement: path.resolve(dir, '../dapp/src/index.ts'),
      },
    ],
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
