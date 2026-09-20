/**
 * Prepares local deploy artifacts. Does not submit a transaction.
 * Run: npx tsx src/deploy.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { computeTargetHash, generateTargetNumber } from './hash.js';
import { NETWORK_CONFIG } from './providers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GAME_CONFIG = {
  maxPlayers: 3n,
  rangeMin: 1n,
  rangeMax: 100n,
  stakeAmount: 10n,
};

async function prepare() {
  console.log('MidnightBet — prepare deploy artifacts (no network submit)');
  console.log(`Network: ${NETWORK_CONFIG.networkId}`);
  console.log(`Indexer: ${NETWORK_CONFIG.indexerUri}`);
  console.log(`Proof server: ${NETWORK_CONFIG.proofServerUri}`);

  const secretKey = crypto.getRandomValues(new Uint8Array(32));
  const targetSalt = crypto.getRandomValues(new Uint8Array(32));
  const targetNumber = generateTargetNumber(GAME_CONFIG.rangeMin, GAME_CONFIG.rangeMax);
  const targetHash = computeTargetHash(targetNumber, targetSalt);

  const deploymentInfo = {
    network: NETWORK_CONFIG.networkId,
    submitted: false,
    note: 'This file is local secrets only. Deploy from the browser UI after compiling Compact.',
    gameConfig: {
      maxPlayers: GAME_CONFIG.maxPlayers.toString(),
      rangeMin: GAME_CONFIG.rangeMin.toString(),
      rangeMax: GAME_CONFIG.rangeMax.toString(),
      stakeAmount: GAME_CONFIG.stakeAmount.toString(),
    },
    creatorPrivateState: {
      secretKey: Buffer.from(secretKey).toString('hex'),
      targetSalt: Buffer.from(targetSalt).toString('hex'),
      targetNumber: targetNumber.toString(),
      targetHash: Buffer.from(targetHash).toString('hex'),
    },
    timestamp: new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, '../../deployment.json');
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Wrote ${outputPath} (gitignored). Do not share this file.`);
}

prepare().catch(console.error);
