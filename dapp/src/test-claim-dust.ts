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
  console.log('Testing createDustGenerationTransaction on Preview...');
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

  let currentState: any;
  const sub = facade.state().subscribe((s) => {
    currentState = s;
  });
  await new Promise((r) => setTimeout(r, 2000));
  sub.unsubscribe();

  const nightUtxos = currentState.unshielded.totalCoins.map((c: any) => ({
    ...c.utxo,
    ...c.meta,
  }));
  console.log(`Found ${nightUtxos.length} total coins. First coin type: ${nightUtxos[0]?.type}, registered: ${nightUtxos[0]?.registeredForDustGeneration}`);

  const now = new Date();
  const ttl = new Date(Date.now() + 60 * 60 * 1000);

  try {
    console.log('Generating dust generation transaction...');
    const tx = await (facade.dust as any).createDustGenerationTransaction(
      now,
      ttl,
      nightUtxos,
      keystore.getPublicKey(),
      currentState.dust.address,
    );
    console.log('Dust generation tx created successfully:', tx.constructor.name);
    console.log('tx prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(tx)));
    console.log('tx keys:', Object.keys(tx));
    console.log('tx.signaturesPreimage?', typeof (tx as any).signaturesPreimage);
    console.log('tx.signatures_preimage?', typeof (tx as any).signatures_preimage);
    console.log('tx.signaturePreimage?', typeof (tx as any).signaturePreimage);

    // Sign with dust generation signature
    const intent = tx.intents.get(1);
    console.log('Got intent for segment 1:', !!intent);
    const dataToSign = intent.signatureData(1);
    console.log('dataToSign length:', dataToSign.length);
    const signature = keystore.signData(dataToSign);
    console.log('Signature created successfully');

    const signedTx = await (facade.dust as any).addDustGenerationSignature(tx, signature);
    console.log('Dust generation signature added successfully');

    console.log('Finalizing (proving and binding) transaction...');
    const finalized = await facade.finalizeTransaction(signedTx);
    console.log('Submitting dust generation transaction to Midnight Preview...');
    const txId = await facade.submitTransaction(finalized);
    console.log('✓ Dust generation transaction SUBMITTED! TX ID:', txId);
  } catch (err) {
    console.error('Dust generation failed:', err);
  }

  await facade.stop();
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
