/**
 * Single Hub operations for MidnightBet.
 * Contract is deployed once; rooms are created and joined via circuit calls.
 */

import { deployContract, findDeployedContract, getPublicStates } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { GameProviders } from './providers.js';
import {
  buildWitnesses,
  codeToRoomId,
  ledgerToRoomState,
  privateStateIdFor,
  type GameState,
} from './game-api.js';
import { computeTargetHash } from './hash.js';
import {
  bytesToHex,
  hexToBytes,
  rememberHostGame,
  type GamePrivateState,
} from './private-state.js';

const MANAGED_PATH = 'contract/managed/guessing-game';

export interface CreateRoomParams {
  roomCode: string;
  maxPlayers: bigint;
  rangeMin: bigint;
  rangeMax: bigint;
  stakeAmount: bigint;
  targetNumber: bigint;
  targetSalt: Uint8Array;
}

async function loadGenerated() {
  try {
    return await import('../../contract/managed/guessing-game/contract/index.js');
  } catch {
    throw new Error(
      'Compact output missing. Compile first: npm run compile.',
    );
  }
}

export async function compiledGuessingGame(privateState: GamePrivateState) {
  const generated = await loadGenerated();
  const witnesses = buildWitnesses(privateState);
  const CC = CompiledContract as {
    make: (name: string, ctor: unknown) => { pipe?: (...ops: unknown[]) => unknown };
    withWitnesses: (...args: unknown[]) => unknown;
    withCompiledFileAssets: (...args: unknown[]) => unknown;
  };
  const made = CC.make('guessing-game', generated.Contract);
  if (typeof made.pipe === 'function') {
    try {
      return made.pipe(CC.withWitnesses(witnesses), CC.withCompiledFileAssets(MANAGED_PATH));
    } catch {
      return made.pipe(CC.withWitnesses(witnesses));
    }
  }
  const withW = CC.withWitnesses(made, witnesses);
  try {
    return CC.withCompiledFileAssets(withW, MANAGED_PATH);
  } catch {
    return withW;
  }
}

/**
 * Deploy the Single Hub Contract once to Midnight Preview.
 */
export async function deployHub(
  providers: GameProviders,
  privateState: GamePrivateState,
) {
  const compiledContract = (await compiledGuessingGame(privateState)) as never;
  const deployed = await deployContract(providers as never, {
    compiledContract,
    privateStateId: 'midnightbet:hub-deploy',
    initialPrivateState: privateState,
    args: [],
  });
  const contractAddress = deployed.deployTxData.public.contractAddress as string;
  return { deployed, contractAddress };
}

/**
 * Connect to an already-deployed Single Hub Contract.
 */
export async function connectToHub(
  providers: GameProviders,
  contractAddress: string,
  privateState: GamePrivateState,
) {
  const compiledContract = (await compiledGuessingGame(privateState)) as never;
  return findDeployedContract(providers as never, {
    contractAddress,
    compiledContract,
    privateStateId: privateStateIdFor(contractAddress),
    initialPrivateState: privateState,
  });
}

export type DeployedHub = Awaited<ReturnType<typeof connectToHub>>;
// Backwards compatibility alias
export type DeployedGame = DeployedHub;

export async function readRoomState(
  providers: GameProviders,
  contractAddress: string,
  roomCode: string,
): Promise<GameState> {
  const generated = await loadGenerated();
  const publicStates = await getPublicStates(providers as never, contractAddress);
  const ledgerData = generated.ledger((publicStates as { contractState: { data: unknown } }).contractState.data as never);
  return ledgerToRoomState(ledgerData, roomCode, generated.pureCircuits);
}

export function subscribeRoomState(
  providers: GameProviders,
  contractAddress: string,
  roomCode: string,
  onState: (state: GameState) => void,
  onError?: (err: Error) => void,
): () => void {
  const observable = providers.publicDataProvider.contractStateObservable?.(
    contractAddress,
    { type: 'latest' } as never,
  );
  if (!observable?.subscribe) {
    const timer = setInterval(() => {
      readRoomState(providers, contractAddress, roomCode).then(onState).catch((e) => onError?.(e));
    }, 4000);
    void readRoomState(providers, contractAddress, roomCode).then(onState).catch((e) => onError?.(e));
    return () => clearInterval(timer);
  }
  const sub = observable.subscribe({
    next: async (contractState: { data?: unknown }) => {
      try {
        const generated = await loadGenerated();
        onState(ledgerToRoomState(generated.ledger((contractState as { data: unknown }).data as never), roomCode, generated.pureCircuits));
      } catch (e) {
        onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    },
    error: (e: unknown) => onError?.(e instanceof Error ? e : new Error(String(e))),
  });
  return () => sub.unsubscribe?.();
}

export async function callFaucet(deployed: DeployedHub) {
  return deployed.callTx.faucet();
}

export async function callCreateRoom(deployed: DeployedHub, params: CreateRoomParams) {
  const targetHash = computeTargetHash(params.targetNumber, params.targetSalt);
  const roomId = codeToRoomId(params.roomCode);

  rememberHostGame({
    roomCode: params.roomCode,
    targetSaltHex: bytesToHex(params.targetSalt),
    targetNumber: params.targetNumber.toString(),
  });

  return deployed.callTx.createRoom(
    roomId,
    params.maxPlayers,
    params.rangeMin,
    params.rangeMax,
    params.stakeAmount,
    targetHash,
  );
}

export async function callJoinRoom(deployed: DeployedHub, roomCode: string) {
  const roomId = codeToRoomId(roomCode);
  return deployed.callTx.joinRoom(roomId);
}

export async function callGuess(deployed: DeployedHub, roomCode: string, number: bigint) {
  const roomId = codeToRoomId(roomCode);
  return deployed.callTx.guess(roomId, number);
}

export async function callDeclareWinner(
  deployed: DeployedHub,
  roomCode: string,
  playerBytesHex: string,
  targetNumber: bigint,
) {
  const roomId = codeToRoomId(roomCode);
  const bytes = hexToBytes(playerBytesHex);
  return deployed.callTx.declareWinner(roomId, { bytes }, targetNumber);
}

export async function callGiveUp(deployed: DeployedHub, roomCode: string) {
  const roomId = codeToRoomId(roomCode);
  return deployed.callTx.giveUp(roomId);
}

export async function callCancelRoom(deployed: DeployedHub, roomCode: string) {
  const roomId = codeToRoomId(roomCode);
  return deployed.callTx.cancelRoom(roomId);
}

export async function callClaimRefund(deployed: DeployedHub, roomCode: string) {
  const roomId = codeToRoomId(roomCode);
  return deployed.callTx.claimRefund(roomId);
}

// Backwards compatibility wrappers
export const connectToGame = connectToHub;
export const readGameState = (providers: GameProviders, contractAddress: string) => readRoomState(providers, contractAddress, 'DEFAULT');
export const subscribeGameState = (providers: GameProviders, contractAddress: string, onState: (s: GameState) => void, onError?: (e: Error) => void) =>
  subscribeRoomState(providers, contractAddress, 'DEFAULT', onState, onError);
export const callJoinGame = callJoinRoom;
export const callCancelGame = callCancelRoom;
