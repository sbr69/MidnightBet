import { HDWallet, Roles } from '@midnightntwrk/wallet-sdk-hd';
import { mnemonicToSeedSync } from '@scure/bip39';
import { WalletFacade, WalletEntrySchema } from '@midnightntwrk/wallet-sdk-facade';
import { ShieldedWallet } from '@midnightntwrk/wallet-sdk-shielded';
import { UnshieldedWallet, PublicKey, createKeystore } from '@midnightntwrk/wallet-sdk-unshielded-wallet';
import { DustWallet } from '@midnightntwrk/wallet-sdk-dust-wallet';
import { InMemoryTransactionHistoryStorage } from '@midnightntwrk/wallet-sdk-abstractions';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

setNetworkId('preview');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
const content = fs.readFileSync(envPath, 'utf-8');
const match = content.match(/MY_PREVIEW_MNEMONIC\s*=\s*["']?([^"'\r\n]+)["']?/);
const mnemonic = match![1].trim();

async function run() {
  console.log('Inspecting Preview Wallet...');
  const seed = mnemonicToSeedSync(mnemonic);
  const hd = HDWallet.fromSeed(seed);
  if (hd.type !== 'seedOk') throw new Error('HDWallet seedError');

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
    batchUpdates: {
      size: 1000,
      spacing: 0,
    },
    provingServerUrl: 'https://proof.preview.midnight.network',
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema as any),
  };

  const facade = await WalletFacade.init({
    configuration: configuration as any,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSeed(zswap.key),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(pk),
    dust: (cfg) => DustWallet(cfg).startWithSeed(dust.key, ledger.LedgerParameters.initialParameters().dust),
  });

  await facade.start(zswapSecretKeys, dustSecretKey);
  console.log('Wallet started. Syncing to network tip...');

  let latestState: any;
  const sub = facade.state().subscribe((state) => {
    latestState = state;
  });

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    if (!latestState) continue;
    const dustProg = (latestState.dust as any).state?.progress ?? (latestState.dust as any).progress;
    const unshieldedProg = latestState.unshielded.progress;
    console.log(`[${i * 3}s] Dust sync: ${dustProg?.appliedIndex} / ${dustProg?.highestRelevantWalletIndex} | isSynced: ${latestState.isSynced}`);

    if (dustProg && dustProg.appliedIndex >= dustProg.highestRelevantWalletIndex && dustProg.highestRelevantWalletIndex > 0n) {
      console.log('✓ Dust wallet has reached network tip!');
      break;
    }
  }

  sub.unsubscribe();

  if (latestState) {
    console.log('\n--- FINAL SYNCED STATE ---');
    console.log('Unshielded balance:', latestState.unshielded.balances);
    console.log('Shielded balance:', latestState.shielded.balances);
    const now = new Date();
    try {
      console.log('Dust balance now:', latestState.dust.balance(now));
      const coinsWithMeta = latestState.unshielded.totalCoins.map((c: any) => ({ ...c.utxo, ...c.meta }));
      console.log('Dust estimate for unshielded coins:', latestState.dust.estimateDustGeneration(coinsWithMeta, now));
    } catch (e) {
      console.log('Dust balance error:', e);
    }
  }

  await facade.stop();
  console.log('Done.');
}

run().catch((err) => {
  console.error('Wallet inspect error:', err);
  process.exit(1);
});
