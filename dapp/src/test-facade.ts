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
  console.log('Testing WalletFacade with startWithSeed...');
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
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema as any),
  };

  const facade = await WalletFacade.init({
    configuration: configuration as any,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSeed(zswap.key),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(pk),
    dust: (cfg) => DustWallet(cfg).startWithSeed(dust.key, ledger.LedgerParameters.initialParameters().dust),
  });

  const dustSecretKey = ledger.DustSecretKey.fromSeed(dust.key);
  const zswapSecretKeys = ledger.ZswapSecretKeys.fromSeed(zswap.key);

  console.log('Facade created successfully!');
  await facade.start(zswapSecretKeys, dustSecretKey);
  console.log('Facade started syncing...');

  await new Promise((resolve) => setTimeout(resolve, 6000));

  await facade.stop();
  console.log('Facade stopped cleanly with ZERO errors!');
}

run().catch((err) => {
  console.error('Facade test error:', err);
  process.exit(1);
});
