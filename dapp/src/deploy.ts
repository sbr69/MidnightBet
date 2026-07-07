/**
 * deploy.ts
 * 
 * Deploys the MidnightBet contract to Midnight Preprod (or local devnet).
 * Run with: npx tsx src/deploy.ts
 * 
 * Prerequisites:
 *   - Docker services running: proof-server, indexer, node (see docker-compose below)
 *   - Lace wallet funded with tDUST (for gas fees)
 *   - WALLET_SEED env var set (or use the Lace browser extension via dapp-connector)
 */

import { createContractInstance, computeTargetHash, generateTargetNumber, type GamePrivateState, NETWORK_CONFIG } from './game-api.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Game Configuration ───────────────────────────────────────────────────────
const GAME_CONFIG = {
  maxPlayers: 3n,
  rangeMin: 1n,
  rangeMax: 100n,
  stakeAmount: 10n,
};

async function deploy() {
  console.log('🌙 MidnightBet — Contract Deployer');
  console.log('────────────────────────────────────');
  console.log(`Network: ${NETWORK_CONFIG.networkId}`);
  console.log(`Indexer: ${NETWORK_CONFIG.indexerUri}`);
  console.log(`Proof Server: ${NETWORK_CONFIG.proofServerUri}`);
  console.log('');

  // 1. Generate creator's private state
  const secretKey = crypto.getRandomValues(new Uint8Array(32));
  const targetSalt = crypto.getRandomValues(new Uint8Array(32));
  const targetNumber = generateTargetNumber(GAME_CONFIG.rangeMin, GAME_CONFIG.rangeMax);
  const targetHash = await computeTargetHash(targetNumber, targetSalt);

  console.log(`🎯 Target number: ${targetNumber} (kept private)`);
  console.log(`🔑 Target hash: ${Buffer.from(targetHash).toString('hex').slice(0, 16)}...`);

  const creatorPrivateState: GamePrivateState = {
    secretKey,
    targetSalt,
    targetNumber,
  };

  // 2. Create the contract instance
  const contract = createContractInstance(creatorPrivateState);
  console.log('✅ Contract instance created with ZK witnesses');

  // 3. In a real deployment, you would:
  //    - Connect to Midnight SDK providers
  //    - Call deployContract(contract, initialState(...)) 
  //    - Wait for transaction confirmation
  //    - Save the contract address
  //
  //    Example (requires @midnight-ntwrk/midnight-js fully wired):
  //
  //    const providers = await buildProviders(creatorPrivateState);
  //    const deployedContract = await providers.midnightProvider.deploy(
  //      contract,
  //      contract.initialState(ctx, ...constructorArgs)
  //    );
  //    const contractAddress = deployedContract.deployTxData.public.contractAddress;

  console.log('');
  console.log('⚡ To complete deployment, wire up the Midnight SDK providers.');
  console.log('   See: https://docs.midnight.network/develop/tutorial/building/');
  console.log('');

  // 4. Save deployment info (private state encrypted in a real app)
  const deploymentInfo = {
    network: NETWORK_CONFIG.networkId,
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
  console.log(`💾 Deployment info saved to: deployment.json`);
  console.log('   ⚠️  Keep deployment.json private — it contains your secret key!');
}

deploy().catch(console.error);
