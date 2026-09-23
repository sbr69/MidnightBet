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
  console.log('Testing Dust Registration on Preview...');
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

  const facade = await WalletFacade.init({
    configuration: configuration as any,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSeed(zswap.key),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(pk),
    dust: (cfg) => DustWallet(cfg).startWithSeed(dust.key, ledger.LedgerParameters.initialParameters().dust),
  });

  await facade.start(zswapSecretKeys, dustSecretKey);
  console.log('Waiting for sync...');
  await new Promise((r) => setTimeout(r, 10000));

  // Get current state snapshot
  let currentState: any;
  const sub = facade.state().subscribe((s) => {
    currentState = s;
  });
  await new Promise((r) => setTimeout(r, 2000));
  sub.unsubscribe();

  if (!currentState) {
    throw new Error('Could not get wallet state');
  }

  console.log('Current unshielded coins:', currentState.unshielded.totalCoins.length);
  for (const c of currentState.unshielded.totalCoins) {
    console.log(' - value:', c.utxo.value, 'registered:', c.meta.registeredForDustGeneration);
  }

  const unregistered = currentState.unshielded.totalCoins.filter(
    (c: any) => !c.meta.registeredForDustGeneration,
  );

  if (unregistered.length === 0) {
    console.log('All coins already registered for dust generation!');
  } else {
    console.log(`Registering ${unregistered.length} coins for dust generation...`);
    const recipe = await facade.registerNightUtxosForDustGeneration(
      unregistered,
      keystore.getPublicKey(),
      (data) => keystore.signData(data),
      currentState.dust.address,
    );
    console.log('Finalizing recipe...');
    const finalized = await facade.finalizeRecipe(recipe);
    console.log('Submitting dust registration...');
    const txId = await facade.submitTransaction(finalized);
    console.log('✓ Dust registration submitted! TX ID:', txId);
  }

  await facade.stop();
}

run().catch((err) => {
  console.error('Registration test error:', err);
  process.exit(1);
});
