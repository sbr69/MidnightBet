/**
 * game-api.ts
 * 
 * High-level TypeScript API wrapping all Midnight contract circuits.
 * This is what the frontend imports to interact with the on-chain game.
 * 
 * Architecture:
 *  - Each method builds and submits a Midnight transaction via the SDK
 *  - Witnesses (secrets) are provided from browser-local state (privateStateProvider)
 *  - ZK proofs are generated client-side via the proof-server
 *  - Ledger state is read via the indexer (publicDataProvider)
 */

import { Contract, type Ledger, type Witnesses } from '../../contract/managed/guessing-game/contract/index.js';
import { NETWORK_CONFIG } from './providers.js';

// ─── Private State ────────────────────────────────────────────────────────────
// The private state holds the player's secret key and (for the creator) the
// target salt. It lives only in the browser's local storage via privateStateProvider.

export interface GamePrivateState {
  /** 32-byte secret key derived from crypto.getRandomValues */
  secretKey: Uint8Array;
  /** Creator only: 32-byte salt used in the target hash commitment */
  targetSalt?: Uint8Array;
  /** Creator only: the actual target number (never sent on-chain) */
  targetNumber?: bigint;
}

// ─── Witnesses Implementation ─────────────────────────────────────────────────
// These functions are called by the ZK circuit during proof generation.
// They receive the private state and return the witness values.

export function buildWitnesses(privateState: GamePrivateState): Witnesses<GamePrivateState> {
  return {
    getUserSecret(_ctx) {
      return [privateState, { bytes: privateState.secretKey }];
    },
    getTargetSalt(_ctx) {
      if (!privateState.targetSalt) {
        throw new Error('Target salt not available — only the game creator has this');
      }
      return [privateState, privateState.targetSalt];
    },
  };
}

// ─── Helper: Compute Target Hash ─────────────────────────────────────────────
// Matches the persistentHash<TargetCommitment> used in the Compact contract.
// We use the Web Crypto API to SHA-256 hash (targetNumber ++ salt).
export async function computeTargetHash(
  targetNumber: bigint,
  salt: Uint8Array
): Promise<Uint8Array> {
  // Encode: 8 bytes for uint64 (big-endian) + 32 bytes salt
  const buf = new ArrayBuffer(40);
  const view = new DataView(buf);
  view.setBigUint64(0, targetNumber, false); // big-endian
  const bytes = new Uint8Array(buf);
  bytes.set(salt, 8);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(hash);
}

// ─── Helper: Generate Random Target ──────────────────────────────────────────
export function generateTargetNumber(rangeMin: bigint, rangeMax: bigint): bigint {
  const range = Number(rangeMax - rangeMin) + 1;
  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  return rangeMin + BigInt(random % range);
}

// ─── Game State Reader (via Ledger type) ─────────────────────────────────────
// The frontend polls this to keep the UI in sync with the blockchain.
export interface GameState {
  phase: 'WaitingForPlayers' | 'InProgress' | 'Finished' | 'Cancelled';
  maxPlayers: number;
  currentPlayerCount: number;
  rangeMin: number;
  rangeMax: number;
  stakeAmount: number;
  totalPool: number;
  currentRound: number;
  winner: string | null; // hex of winner public key bytes, or null
}

// Map ledger phase number to string
function phaseToString(p: number): GameState['phase'] {
  const phases: GameState['phase'][] = ['WaitingForPlayers', 'InProgress', 'Finished', 'Cancelled'];
  return phases[p] ?? 'Cancelled';
}

export function ledgerToGameState(l: Ledger): GameState {
  const winnerBytes = l.winner.bytes;
  const isWinnerSet = winnerBytes.some(b => b !== 0);
  return {
    phase: phaseToString(l.gamePhase),
    maxPlayers: Number(l.maxPlayers),
    currentPlayerCount: Number(l.currentPlayerCount),
    rangeMin: Number(l.rangeMin),
    rangeMax: Number(l.rangeMax),
    stakeAmount: Number(l.stakeAmount),
    totalPool: Number(l.totalPool),
    currentRound: Number(l.currentRound),
    winner: isWinnerSet
      ? Array.from(winnerBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      : null,
  };
}

// ─── Contract Instance (for use with midnight-js) ─────────────────────────────
// Call this once per game session with the player's private state.
export function createContractInstance(privateState: GamePrivateState) {
  return new Contract<GamePrivateState>(buildWitnesses(privateState));
}

// ─── Invite Link Utilities ────────────────────────────────────────────────────
export function encodeInviteLink(contractAddress: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  return `${base}/?game=${encodeURIComponent(contractAddress)}`;
}

export function decodeInviteLink(url?: string): string | null {
  const src = url ?? (typeof window !== 'undefined' ? window.location.href : '');
  try {
    const u = new URL(src);
    return u.searchParams.get('game');
  } catch {
    return null;
  }
}

// ─── Network Config Re-export ─────────────────────────────────────────────────
export { NETWORK_CONFIG };
