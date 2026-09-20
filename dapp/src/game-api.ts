import type { Ledger, Witnesses } from '../../contract/managed/guessing-game/contract/index.js';
import type { GamePrivateState } from './private-state.js';
import { bytesToHex } from './private-state.js';

export type GamePhase = 'WaitingForPlayers' | 'InProgress' | 'Finished' | 'Cancelled';

export interface GameState {
  phase: GamePhase;
  maxPlayers: number;
  currentPlayerCount: number;
  rangeMin: number;
  rangeMax: number;
  stakeAmount: number;
  totalPool: number;
  currentRound: number;
  winner: string | null;
  creator: string | null;
  players: string[];
  latestGuesses: Record<string, number>;
  lastGuessedRound: Record<string, number>;
  givenUp: string[];
  giveUpCount: number;
}

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

function phaseToString(p: number): GamePhase {
  const phases: GamePhase[] = ['WaitingForPlayers', 'InProgress', 'Finished', 'Cancelled'];
  return phases[p] ?? 'Cancelled';
}

function pkHex(pk: { bytes: Uint8Array } | Uint8Array | undefined | null): string | null {
  if (!pk) return null;
  const bytes = pk instanceof Uint8Array ? pk : pk.bytes;
  if (!bytes || bytes.length === 0 || bytes.every((b) => b === 0)) return null;
  return bytesToHex(bytes);
}

function iterateMap<K, V>(map: Iterable<[K, V]> | undefined): [K, V][] {
  if (!map) return [];
  try {
    return [...map];
  } catch {
    return [];
  }
}

export function ledgerToGameState(l: Ledger): GameState {
  const players: string[] = [];
  for (const [pk, active] of iterateMap(l.players)) {
    const hex = pkHex(pk);
    if (hex && active) players.push(hex);
  }

  const latestGuesses: Record<string, number> = {};
  for (const [pk, guess] of iterateMap(l.latestGuesses)) {
    const hex = pkHex(pk);
    if (hex) latestGuesses[hex] = Number(guess);
  }

  const lastGuessedRound: Record<string, number> = {};
  for (const [pk, round] of iterateMap(l.lastGuessedRound)) {
    const hex = pkHex(pk);
    if (hex) lastGuessedRound[hex] = Number(round);
  }

  const givenUp: string[] = [];
  for (const [pk, gave] of iterateMap(l.hasGivenUp)) {
    const hex = pkHex(pk);
    if (hex && gave) givenUp.push(hex);
  }

  return {
    phase: phaseToString(Number(l.gamePhase)),
    maxPlayers: Number(l.maxPlayers),
    currentPlayerCount: Number(l.currentPlayerCount),
    rangeMin: Number(l.rangeMin),
    rangeMax: Number(l.rangeMax),
    stakeAmount: Number(l.stakeAmount),
    totalPool: Number(l.totalPool),
    currentRound: Number(l.currentRound),
    winner: pkHex(l.winner),
    creator: pkHex(l.creator),
    players,
    latestGuesses,
    lastGuessedRound,
    givenUp,
    giveUpCount: Number(l.giveUpCount),
  };
}

export function encodeInviteLink(contractAddress: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
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

export function privateStateIdFor(contractAddress: string): string {
  return `midnightbet:${contractAddress}`;
}

export { computeTargetHash, generateTargetNumber } from './hash.js';
export type { GamePrivateState } from './private-state.js';
