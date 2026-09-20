/**
 * Midnight.js providers for browser (Lace) and Node (prepare-only) use.
 */

import '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { setNetworkId, type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import type { GamePrivateState } from './private-state.js';

export const GAME_CIRCUITS = [
  'faucet',
  'joinGame',
  'guess',
  'declareWinner',
  'giveUp',
  'cancelGame',
  'claimRefund',
] as const;

export type GameCircuit = (typeof GAME_CIRCUITS)[number];

export type GameProviders = MidnightProviders<GameCircuit, string, GamePrivateState>;

export const NETWORK_CONFIG = {
  indexerUri: 'https://indexer.preview.midnight.network/api/v4/graphql',
  indexerWsUri: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
  nodeUri: 'https://rpc.preview.midnight.network',
  proofServerUri: 'http://localhost:6300',
  networkId: 'preview' as NetworkId | string,
};

const PRIVATE_STORE_PASSWORD = 'MidnightBet-Local-01';

export function applyNetworkId(networkId: string = String(NETWORK_CONFIG.networkId)): void {
  setNetworkId(networkId as NetworkId);
}

export interface WalletInfo {
  id: string;
  name: string;
  icon?: string;
  api: InitialAPI;
}

/**
 * Enumerate all installed Midnight wallets in window.midnight (1AM, Lace, etc.)
 */
export function getAvailableWallets(): WalletInfo[] {
  if (typeof window === 'undefined' || !window.midnight) return [];
  const entries: WalletInfo[] = [];

  for (const [key, val] of Object.entries(window.midnight)) {
    if (val && typeof val === 'object' && 'connect' in val) {
      const api = val as InitialAPI;
      let name = (api as any).name || key;
      if (/1am/i.test(key) || /1am/i.test(name)) {
        name = '1AM Wallet';
      } else if (/lace/i.test(key) || /lace/i.test(name)) {
        name = 'Lace Wallet';
      }
      entries.push({
        id: key,
        name,
        icon: (api as any).icon,
        api,
      });
    }
  }
  return entries;
}

export function getFirstCompatibleWallet(walletId?: string): InitialAPI | undefined {
  if (typeof window === 'undefined' || !window.midnight) return undefined;
  const wallets = getAvailableWallets();
  if (wallets.length === 0) return undefined;

  if (walletId) {
    const matched = wallets.find((w) => w.id.toLowerCase() === walletId.toLowerCase());
    if (matched) return matched.api;
  }

  // Auto-detect priority: 1AM first, then Lace, then any available
  const oneAm = wallets.find((w) => /1am/i.test(w.name) || /1am/i.test(w.id));
  if (oneAm) return oneAm.api;

  const lace = wallets.find((w) => /lace/i.test(w.name) || /lace/i.test(w.id));
  if (lace) return lace.api;

  return wallets[0]?.api;
}

export async function connectMidnightWallet(
  walletId?: string,
  networkId: string = String(NETWORK_CONFIG.networkId),
): Promise<{
  api: ConnectedAPI;
  address: string;
  networkId: string;
  walletName: string;
}> {
  const wallet = getFirstCompatibleWallet(walletId);
  if (!wallet) {
    throw new Error(
      'No compatible Midnight wallet found. Please install 1AM Wallet (1am.xyz) or Lace (lace.io) extension.',
    );
  }
  const api = await wallet.connect(networkId);
  const status = await api.getConnectionStatus();
  const connectedNetwork = ('networkId' in status && status.networkId) ? status.networkId : networkId;
  applyNetworkId(connectedNetwork);
  const shielded = await api.getShieldedAddresses();
  const walletName = (wallet as any).name ?? 'Midnight Wallet';
  return {
    api,
    address: shielded.shieldedAddress,
    networkId: connectedNetwork,
    walletName,
  };
}

export async function connectLaceWallet(networkId: string = String(NETWORK_CONFIG.networkId)): Promise<{
  api: ConnectedAPI;
  address: string;
  networkId: string;
}> {
  return connectMidnightWallet('lace', networkId);
}

export async function buildBrowserProviders(
  walletApi: ConnectedAPI,
  accountId: string,
  zkArtifactsOrigin: string = typeof window !== 'undefined' ? window.location.origin : '',
): Promise<GameProviders> {
  const config = await walletApi.getConfiguration();
  const indexerUri = config.indexerUri || NETWORK_CONFIG.indexerUri;
  const indexerWsUri = config.indexerWsUri || NETWORK_CONFIG.indexerWsUri;
  const proofServerUri = config.proverServerUri || NETWORK_CONFIG.proofServerUri;
  const shieldedAddresses = await walletApi.getShieldedAddresses();

  const zkConfigProvider = new FetchZkConfigProvider<GameCircuit>(
    zkArtifactsOrigin,
    fetch.bind(globalThis),
  );

  const privateStateProvider = levelPrivateStateProvider<string, GamePrivateState>({
    privateStateStoreName: 'midnightbet-private-state',
    signingKeyStoreName: 'midnightbet-signing-keys',
    privateStoragePasswordProvider: () => PRIVATE_STORE_PASSWORD,
    accountId,
  });

  return {
    privateStateProvider,
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(indexerUri, indexerWsUri),
    walletProvider: {
      getCoinPublicKey() {
        return shieldedAddresses.shieldedCoinPublicKey;
      },
      getEncryptionPublicKey() {
        return shieldedAddresses.shieldedEncryptionPublicKey;
      },
      async balanceTx(tx: { serialize: () => Uint8Array }) {
        try {
          const received = await walletApi.balanceUnsealedTransaction(toHex(tx.serialize()));
          const { Transaction } = await import('@midnight-ntwrk/midnight-js-protocol/ledger');
          return Transaction.deserialize('signature', 'proof', 'binding', fromHex(received.tx));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`Wallet failed to balance the transaction: ${message}`);
        }
      },
    },
    midnightProvider: {
      async submitTx(tx: { serialize: () => Uint8Array; identifiers?: () => string[] }) {
        await walletApi.submitTransaction(toHex(tx.serialize()));
        const ids = typeof tx.identifiers === 'function' ? tx.identifiers() : [];
        return ids[0] ?? '';
      },
    },
  } as GameProviders;
}

export function createReadOnlyProviders(zkArtifactsOrigin?: string): Pick<
  GameProviders,
  'publicDataProvider' | 'zkConfigProvider'
> {
  const origin = zkArtifactsOrigin ?? NETWORK_CONFIG.indexerUri;
  const zkConfigProvider = new FetchZkConfigProvider<GameCircuit>(
    typeof window !== 'undefined' ? window.location.origin : origin,
    fetch.bind(globalThis),
  );
  return {
    zkConfigProvider,
    publicDataProvider: indexerPublicDataProvider(
      NETWORK_CONFIG.indexerUri,
      NETWORK_CONFIG.indexerWsUri,
    ),
  };
}
