export type { GamePrivateState, HostGameRecord } from './private-state.js';
export {
  loadOrCreateSecretKey,
  privateStateFor,
  rememberHostGame,
  hostRecordFor,
  bytesToHex,
  hexToBytes,
} from './private-state.js';
export {
  buildWitnesses,
  ledgerToGameState,
  encodeInviteLink,
  decodeInviteLink,
  privateStateIdFor,
  computeTargetHash,
  generateTargetNumber,
  type GameState,
  type GamePhase,
} from './game-api.js';
export {
  NETWORK_CONFIG,
  applyNetworkId,
  getAvailableWallets,
  getFirstCompatibleWallet,
  connectMidnightWallet,
  connectLaceWallet,
  buildBrowserProviders,
  type GameProviders,
  type GameCircuit,
  type WalletInfo,
} from './providers.js';
export {
  compiledGuessingGame,
  deployGame,
  connectToGame,
  readGameState,
  subscribeGameState,
  callFaucet,
  callJoinGame,
  callGuess,
  callDeclareWinner,
  callGiveUp,
  callCancelGame,
  callClaimRefund,
  type CreateGameParams,
  type DeployedGame,
} from './game-client.js';
