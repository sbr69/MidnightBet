import { HDWallet, Roles } from '@midnightntwrk/wallet-sdk-hd';
import { mnemonicToSeedSync } from '@scure/bip39';
import { WalletFacade, WalletEntrySchema } from '@midnightntwrk/wallet-sdk-facade';
import { ShieldedWallet } from '@midnightntwrk/wallet-sdk-shielded';
import { UnshieldedWallet, PublicKey, createKeystore } from '@midnightntwrk/wallet-sdk-unshielded-wallet';
import { DustWallet } from '@midnightntwrk/wallet-sdk-dust-wallet';
import { InMemoryTransactionHistoryStorage } from '@midnightntwrk/wallet-sdk-abstractions';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { compiledGuessingGame } from './game-client.js';

setNetworkId('preview');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const DAPP_ROOT = path.resolve(__dirname, '../');

const envPath = path.join(DAPP_ROOT, '.env');
const content = fs.readFileSync(envPath, 'utf-8');
const match = content.match(/MY_PREVIEW_MNEMONIC\s*=\s*["']?([^"'\r\n]+)["']?/);
const mnemonic = match![1].trim();

async function run() {
  console.log('=== MidnightBet Single Hub CLI Deployment ===');
  console.log('Network: Midnight Preview Testnet');

  const seed = mnemonicToSeedSync(mnemonic);
  const hd = HDWallet.fromSeed(seed);
  if (hd.type !== 'seedOk') throw new Error('HDWallet seed error');

  const account = hd.hdWallet.selectAccount(0);
  const nightExt = account.selectRole(Roles.NightExternal).deriveKeyAt(0);
  const dust = account.selectRole(Roles.Dust).deriveKeyAt(0);
  const zswap = account.selectRole(Roles.Zswap).deriveKeyAt(0);

  if (nightExt.type !== 'keyDerived' || dust.type !== 'keyDerived' || zswap.type !== 'keyDerived') {
    throw new Error('Key derivation failed');
  }

  const keystore = createKeystore(nightExt.key, 'preview');
  const pk = PublicKey.fromKeyStore(keystore);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(dust.key);
  const zswapSecretKeys = ledger.ZswapSecretKeys.fromSeed(zswap.key);

  const configuration = {
    networkId: 'preview',
    relayURL: new URL('wss://rpc.preview.midnight.network'),
    nodeURL: new URL('wss://rpc.preview.midnight.network'),
    indexerClientConnection: {
      indexerHttpUrl: 'https://indexer.preview.midnight.network/api/v4/graphql',
      indexerWsUrl: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    },
    nodeClientConnection: {
      nodeRpcUrl: 'wss://rpc.preview.midnight.network',
    },
    provingServerUrl: 'https://proof.preview.midnight.network',
    costParameters: {
      feeBlocksMargin: 5,
      additionalFeeOverhead: 0n,
    },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema as any),
  };

  console.log('Initializing WalletFacade...');
  const facade = await WalletFacade.init({
    configuration: configuration as any,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSeed(zswap.key),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(pk),
    dust: (cfg) => DustWallet(cfg).startWithSeed(dust.key, ledger.LedgerParameters.initialParameters().dust),
  });

  console.log('Starting wallet sync...');
  await facade.start(zswapSecretKeys, dustSecretKey);

  // Wait a few seconds for sync
  console.log('Syncing ledger state with Preview network...');
  await new Promise((resolve) => setTimeout(resolve, 8000));

  const managedDir = path.resolve(PROJECT_ROOT, 'contract/managed/guessing-game');
  console.log('Using managed artifacts from:', managedDir);
  const zkConfigProvider = new NodeZkConfigProvider(managedDir);

  const proofProvider = httpClientProofProvider(
    'https://proof.preview.midnight.network',
    zkConfigProvider as any,
  );

  const publicDataProvider = indexerPublicDataProvider(
    'https://indexer.preview.midnight.network/api/v4/graphql',
    'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
  );

  const dbDir = path.join(DAPP_ROOT, 'temp-level-db');
  fs.mkdirSync(dbDir, { recursive: true });
  const privateStateProvider = levelPrivateStateProvider({
    privateStateStoreName: path.join(dbDir, 'private-state'),
    signingKeyStoreName: path.join(dbDir, 'signing-keys'),
    privateStoragePasswordProvider: () => 'dev-pass-123',
    accountId: 'deployer-0',
  });

  const providers: any = {
    privateStateProvider,
    zkConfigProvider,
    proofProvider,
    publicDataProvider,
    walletProvider: {
      getCoinPublicKey: () => zswapSecretKeys.coinPublicKey,
      getEncryptionPublicKey: () => zswapSecretKeys.encryptionPublicKey,
      async balanceTx(tx: any) {
        console.log('Balancing deployment transaction...');
        const ttl = new Date(Date.now() + 30 * 60 * 1000);
        const secretKeys = { shieldedSecretKeys: zswapSecretKeys, dustSecretKey };
        let recipe;
        try {
          recipe = await facade.balanceUnboundTransaction(tx, secretKeys, { ttl });
        } catch (e1) {
          console.log('balanceUnboundTransaction fallback:', e1);
          recipe = await facade.balanceUnprovenTransaction(tx, secretKeys, { ttl });
        }
        console.log('Finalizing recipe...');
        return await facade.finalizeRecipe(recipe);
      },
    },
    midnightProvider: {
      async submitTx(tx: any) {
        console.log('Submitting transaction to Midnight node RPC...');
        const txId = await facade.submitTransaction(tx);
        console.log('Transaction submitted with ID:', txId);
        return txId;
      },
    },
  };

  const initialPrivateState = {
    secretKey: crypto.getRandomValues(new Uint8Array(32)),
  };

  console.log('Loading contract compilation...');
  const compiledContract = (await compiledGuessingGame(initialPrivateState)) as any;

  console.log('Calling deployContract...');
  const deployed = await deployContract(providers, {
    compiledContract,
    privateStateId: 'midnightbet:hub-deploy',
    initialPrivateState,
    args: [],
  });

  const contractAddress = (deployed as any).deployTxData.public.contractAddress as string;
  const txHash = (deployed as any).deployTxData.public.txHash as string;

  console.log('==============================================');
  console.log('🎉 CONTRACT DEPLOYED SUCCESSFULLY TO PREVIEW!');
  console.log('Contract Address:', contractAddress);
  console.log('Transaction Hash:', txHash);
  console.log('==============================================');

  // Update frontend/.env
  const frontendEnvPath = path.resolve(PROJECT_ROOT, 'frontend/.env');
  let frontendEnvContent = fs.existsSync(frontendEnvPath) ? fs.readFileSync(frontendEnvPath, 'utf-8') : '';
  if (frontendEnvContent.includes('VITE_CONTRACT_ADDRESS=')) {
    frontendEnvContent = frontendEnvContent.replace(/VITE_CONTRACT_ADDRESS=.*/, `VITE_CONTRACT_ADDRESS="${contractAddress}"`);
  } else {
    frontendEnvContent += `\nVITE_CONTRACT_ADDRESS="${contractAddress}"\n`;
  }
  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log('✓ Updated frontend/.env with deployed contract address');

  // Update deployment.json
  const deployJsonPath = path.resolve(PROJECT_ROOT, 'deployment.json');
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
  console.log('✓ Saved deployment.json');

  await facade.stop();
}

run().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
