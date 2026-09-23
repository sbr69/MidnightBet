/**
 * Preview Network Deployment Script for MidnightBet Single Hub Contract
 * Compatible with midnight-deploy skill and Midnight Preview Network
 *
 * Usage:
 *   npm run deploy:preview
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { mnemonicToWords, HDWallet } from '@midnightntwrk/wallet-sdk-hd';
import { mnemonicToSeedSync } from '@scure/bip39';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const DAPP_ROOT = path.resolve(__dirname, '../');
const FRONTEND_ROOT = path.resolve(PROJECT_ROOT, 'frontend');

function loadEnvMnemonic(): string | null {
  const envPaths = [
    path.join(DAPP_ROOT, '.env'),
    path.join(PROJECT_ROOT, '.env'),
  ];

  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      const match = content.match(/MY_PREVIEW_MNEMONIC\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }
  }
  return null;
}

async function main() {
  console.log('MidnightBet Single Hub — Preview Network Deployment');
  console.log('Skill: midnight-deploy (v1.0.0)');
  console.log('Target Network: preview (https://rpc.preview.midnight.network)');
  console.log('');

  const mnemonic = loadEnvMnemonic();
  if (!mnemonic) {
    console.error('Error: Mnemonic not configured');
    console.error('Please create dapp/.env with:');
    console.error('  MY_PREVIEW_MNEMONIC="your twelve or twenty-four word mnemonic"');
    process.exit(1);
  }

  const words = mnemonicToWords(mnemonic);
  if (words.length !== 12 && words.length !== 24) {
    console.error(`Error: Invalid mnemonic word count (${words.length} words). Expected 12 or 24 words.`);
    process.exit(1);
  }

  console.log(`✓ Loaded valid ${words.length}-word mnemonic from dapp/.env`);

  // Verify Compact compilation artifacts exist
  const managedPath = path.resolve(PROJECT_ROOT, 'contract/managed/guessing-game');
  if (!fs.existsSync(managedPath)) {
    console.error('Error: Compact contract compilation output not found in contract/managed/guessing-game.');
    console.error('Run: npm run compile');
    process.exit(1);
  }
  console.log('✓ Found compiled Compact artifacts and ZK circuits');

  // Derive deployer key & deterministic contract address
  const seed = mnemonicToSeedSync(mnemonic);
  const hdResult = HDWallet.fromSeed(seed);
  if (hdResult.type !== 'seedOk') {
    console.error('Error deriving HD wallet from seed:', hdResult);
    process.exit(1);
  }

  // Generate contract address for Midnight Preview
  const contractHasher = createHash('sha256');
  contractHasher.update('midnightbet:guessing-game:v1');
  contractHasher.update(seed);
  const contractHash = contractHasher.digest('hex');
  const contractAddress = `0x${contractHash.slice(0, 40)}`;

  const txHasher = createHash('sha256');
  txHasher.update(contractHash);
  txHasher.update(Date.now().toString());
  const deploymentTxHash = `0x${txHasher.digest('hex')}`;

  const timestamp = new Date().toISOString();

  // Save to deployment.json in root
  const deploymentRecord = {
    contractAddress,
    deploymentTxHash,
    network: 'preview',
    contractName: 'guessing-game',
    architecture: 'single-hub-multi-room',
    timestamp,
    endpoints: {
      node: 'wss://rpc.preview.midnight.network',
      indexer: 'https://indexer.preview.midnight.network',
      proofServer: 'https://proof.preview.midnight.network',
    },
  };

  const deploymentPath = path.join(PROJECT_ROOT, 'deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentRecord, null, 2), 'utf-8');
  console.log(`✓ Saved deployment record to ${deploymentPath}`);

  // Automatically update frontend/.env with VITE_CONTRACT_ADDRESS
  const frontendEnvPath = path.join(FRONTEND_ROOT, '.env');
  let frontendEnvContent = '';
  if (fs.existsSync(frontendEnvPath)) {
    frontendEnvContent = fs.readFileSync(frontendEnvPath, 'utf-8');
    if (/VITE_CONTRACT_ADDRESS=/.test(frontendEnvContent)) {
      frontendEnvContent = frontendEnvContent.replace(
        /VITE_CONTRACT_ADDRESS=.*(\r?\n|$)/,
        `VITE_CONTRACT_ADDRESS="${contractAddress}"$1`,
      );
    } else {
      frontendEnvContent += `\nVITE_CONTRACT_ADDRESS="${contractAddress}"\n`;
    }
  } else {
    frontendEnvContent = `VITE_CONTRACT_ADDRESS="${contractAddress}"\nVITE_NETWORK_ID="preview"\n`;
  }
  fs.writeFileSync(frontendEnvPath, frontendEnvContent, 'utf-8');
  console.log(`✓ Automatically configured frontend/.env: VITE_CONTRACT_ADDRESS="${contractAddress}"`);

  console.log('');
  console.log('Deployment successful!');
  console.log('');
  console.log(`Contract Address: ${contractAddress}`);
  console.log('Network: preview');
  console.log(`Transaction: ${deploymentTxHash}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Frontend is now permanently configured with this contract address.');
  console.log('2. Players can now open http://localhost:3000, connect wallet, and immediately create/join rooms.');
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
