import type { Ledger, Witnesses } from '../../contract/managed/guessing-game/contract/index.js';
import type { GamePrivateState } from './private-state.js';
import { bytesToHex, hexToBytes } from './private-state.js';
import { codeToRoomId, roomIdToCode, computeTargetHash, generateTargetNumber, generateRoomCode } from './hash.js';

export type GamePhase = 'WaitingForPlayers' | 'InProgress' | 'Finished' | 'Cancelled';

export interface GameState {
  roomCode: string;
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

function phaseToString(p: number | undefined): GamePhase {
  if (p === undefined) return 'WaitingForPlayers';
  const phases: GamePhase[] = ['WaitingForPlayers', 'InProgress', 'Finished', 'Cancelled'];
  return phases[p] ?? 'Cancelled';
}

export function pkHex(pk: { bytes: Uint8Array } | Uint8Array | undefined | null): string | null {
  if (!pk) return null;
  const bytes = pk instanceof Uint8Array ? pk : pk.bytes;
  if (!bytes || bytes.length === 0 || bytes.every((b) => b === 0)) return null;
  return bytesToHex(bytes);
}

export function ledgerToRoomState(
  l: Ledger,
  roomCode: string,
  pureCircuits?: {
    roomIndexKey: (roomId: Uint8Array, index: bigint) => Uint8Array;
    roomPlayerKey: (roomId: Uint8Array, player: { bytes: Uint8Array }) => Uint8Array;
  },
): GameState {
  const roomId = codeToRoomId(roomCode);
  const exists = l.roomPhase.member(roomId);

  if (!exists) {
    return {
      roomCode,
      phase: 'WaitingForPlayers',
      maxPlayers: 2,
      currentPlayerCount: 0,
      rangeMin: 1,
      rangeMax: 100,
      stakeAmount: 10,
      totalPool: 0,
      currentRound: 0,
      winner: null,
      creator: null,
      players: [],
      latestGuesses: {},
      lastGuessedRound: {},
      givenUp: [],
      giveUpCount: 0,
    };
  }

  const phase = phaseToString(Number(l.roomPhase.lookup(roomId)));
  const maxPlayers = Number(l.roomMaxPlayers.lookup(roomId));
  const currentPlayerCount = Number(l.roomPlayerCount.lookup(roomId));
  const rangeMin = Number(l.roomRangeMin.lookup(roomId));
  const rangeMax = Number(l.roomRangeMax.lookup(roomId));
  const stakeAmount = Number(l.roomStakeAmount.lookup(roomId));
  const totalPool = Number(l.roomTotalPool.lookup(roomId));
  const currentRound = Number(l.roomCurrentRound.lookup(roomId));
  const giveUpCount = Number(l.roomGiveUpCount.lookup(roomId));
  const creator = pkHex(l.roomCreator.lookup(roomId));
  const winner = l.roomWinner.member(roomId) ? pkHex(l.roomWinner.lookup(roomId)) : null;

  const players: string[] = [];
  const latestGuesses: Record<string, number> = {};
  const lastGuessedRound: Record<string, number> = {};
  const givenUp: string[] = [];

  if (pureCircuits) {
    for (let i = 0; i < currentPlayerCount; i++) {
      const idxKey = pureCircuits.roomIndexKey(roomId, BigInt(i));
      if (l.roomPlayerAtIndex.member(idxKey)) {
        const playerPk = l.roomPlayerAtIndex.lookup(idxKey);
        const hex = pkHex(playerPk);
        if (hex) {
          players.push(hex);
          const pKey = pureCircuits.roomPlayerKey(roomId, { bytes: hexToBytes(hex) });
          if (l.roomLatestGuesses.member(pKey)) {
            latestGuesses[hex] = Number(l.roomLatestGuesses.lookup(pKey));
          }
          if (l.roomLastGuessedRound.member(pKey)) {
            lastGuessedRound[hex] = Number(l.roomLastGuessedRound.lookup(pKey));
          }
          if (l.roomHasGivenUp.member(pKey) && l.roomHasGivenUp.lookup(pKey)) {
            givenUp.push(hex);
          }
        }
      }
    }
  }

  return {
    roomCode,
    phase,
    maxPlayers,
    currentPlayerCount,
    rangeMin,
    rangeMax,
    stakeAmount,
    totalPool,
    currentRound,
    winner,
    creator,
    players,
    latestGuesses,
    lastGuessedRound,
    givenUp,
    giveUpCount,
  };
}

export function encodeInviteLink(roomCode: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${base}/?room=${encodeURIComponent(roomCode.trim().toUpperCase())}`;
}

export function decodeInviteLink(url?: string): { roomCode: string | null; contractAddress: string | null } {
  const src = url ?? (typeof window !== 'undefined' ? window.location.href : '');
  try {
    const u = new URL(src);
    const room = u.searchParams.get('room');
    const game = u.searchParams.get('game');
    return {
      roomCode: room ? room.trim().toUpperCase() : null,
      contractAddress: game ? game.trim() : null,
    };
  } catch {
    return { roomCode: null, contractAddress: null };
  }
}

export function privateStateIdFor(contractAddress: string): string {
  return `midnightbet:${contractAddress}`;
}

export {
  computeTargetHash,
  generateTargetNumber,
  generateRoomCode,
  codeToRoomId,
  roomIdToCode,
};
export type { GamePrivateState } from './private-state.js';
