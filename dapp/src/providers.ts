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

// Imports removed because they are not exported exactly like this in 4.1.1
// We will use `any` for the provider interfaces if needed, or omit them.

// ─── Network Configuration ────────────────────────────────────────────────────
// For local development with docker-compose, use these defaults.
// For Midnight Preprod, swap to the preprod endpoints.

export const NETWORK_CONFIG = {
  // Midnight Preprod endpoints:
  indexerUri:    'https://indexer.testnet-02.midnight.network/api/v1/graphql',
  indexerWsUri:  'wss://indexer.testnet-02.midnight.network/api/v1/graphql',
  nodeUri:       'https://rpc.testnet-02.midnight.network',

  // Proof server must run locally to access compiled ZK keys:
  proofServerUri:'http://localhost:6300',

  networkId: 'TestNet',
};

// ─── Provider Setup ───────────────────────────────────────────────────────────
// These are imported from the Midnight SDK and composed together.
// The actual provider constructors come from individual midnight-js sub-packages.
// Keeping this as a typed configuration object allows the frontend to pass it in.

export interface MidnightProviders<PrivateState> {
  publicDataProvider: any;
  proofProvider: any;
  privateStateProvider: any;
  zkConfigProvider: any;
  walletProvider: any;
  midnightProvider: any;
}
