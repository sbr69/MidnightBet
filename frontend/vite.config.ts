import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

import fs from 'node:fs';

const saveDeploymentPlugin = () => ({
  name: 'save-deployment-plugin',
  configureServer(server: any) {
    server.middlewares.use('/api/save-deployment', (req: any, res: any) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
          try {
            const { contractAddress, txHash } = JSON.parse(body);
            if (contractAddress) {
              const envPath = path.resolve(dir, '.env');
              let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
              if (envContent.includes('VITE_CONTRACT_ADDRESS=')) {
                envContent = envContent.replace(/VITE_CONTRACT_ADDRESS=.*/, `VITE_CONTRACT_ADDRESS="${contractAddress}"`);
              } else {
                envContent += `\nVITE_CONTRACT_ADDRESS="${contractAddress}"\n`;
              }
              fs.writeFileSync(envPath, envContent);

              const deployJsonPath = path.resolve(dir, '../deployment.json');
              fs.writeFileSync(
                deployJsonPath,
                JSON.stringify(
                  {
                    contractAddress,
                    deploymentTxHash: txHash,
                    network: 'preview',
                    timestamp: new Date().toISOString(),
                  },
                  null,
                  2
                )
              );
              console.log('✓ [Vite] Saved VITE_CONTRACT_ADDRESS to frontend/.env and deployment.json:', contractAddress);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      } else {
        res.writeHead(405);
        res.end();
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), saveDeploymentPlugin()],
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
      {
        find: 'assert',
        replacement: path.resolve(dir, 'src/shims/assert.ts'),
      },
      {
        find: 'isomorphic-ws',
        replacement: path.resolve(dir, 'src/shims/isomorphic-ws.ts'),
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
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    fs: { allow: [path.resolve(dir, '..')] },
    proxy: {
      '/prove': { target: 'http://localhost:6300', changeOrigin: true },
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
    host: true,
  },
});
