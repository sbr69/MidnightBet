/**
 * providers.ts
 * 
 * Sets up all Midnight.js providers required for a full E2E DApp:
 *   - indexerPublicDataProvider  → reads public ledger state
 *   - proofProvider             → generates ZK proofs (via proof-server)
 *   - privateStateProvider      → manages local private witness state
 *   - zkConfigProvider          → loads compiled ZK circuits/keys
 *   - walletAndMidnightProvider → connects to Lace wallet + midnight-js
 */

import type { MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js/providers';
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js/private-state-provider';
import type { ProofProvider } from '@midnight-ntwrk/midnight-js/proof-provider';
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js/public-data-provider';
import type { ZkConfigProvider } from '@midnight-ntwrk/midnight-js/zk-config-provider';

// ─── Network Configuration ────────────────────────────────────────────────────
// For local development with docker-compose, use these defaults.
// For Midnight Preprod, swap to the preprod endpoints.

export const NETWORK_CONFIG = {
  // Local (docker-compose) endpoints:
  indexerUri:    'http://localhost:8088/api/v1/graphql',
  indexerWsUri:  'ws://localhost:8088/api/v1/graphql',
  proofServerUri:'http://localhost:6300',
  nodeUri:       'http://localhost:9944',

  // Midnight Preprod endpoints (uncomment to use):
  // indexerUri:    'https://indexer.testnet-02.midnight.network/api/v1/graphql',
  // indexerWsUri:  'wss://indexer.testnet-02.midnight.network/api/v1/graphql',
  // proofServerUri:'https://prover.testnet-02.midnight.network',
  // nodeUri:       'https://rpc.testnet-02.midnight.network',

  networkId: 'TestNet',
};

// ─── Provider Setup ───────────────────────────────────────────────────────────
// These are imported from the Midnight SDK and composed together.
// The actual provider constructors come from individual midnight-js sub-packages.
// Keeping this as a typed configuration object allows the frontend to pass it in.

export interface MidnightProviders<PrivateState> {
  publicDataProvider: PublicDataProvider;
  proofProvider: ProofProvider;
  privateStateProvider: PrivateStateProvider<PrivateState>;
  zkConfigProvider: ZkConfigProvider;
  walletProvider: WalletProvider;
  midnightProvider: MidnightProvider;
}
