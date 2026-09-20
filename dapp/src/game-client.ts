/**
 * Chain operations. Requires compiled Compact output under contract/managed/.
 * Callers in the UI invoke these; this module does not run a deploy by itself.
 */

import { deployContract, findDeployedContract, getPublicStates } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { GameProviders } from './providers.js';
import { buildWitnesses, ledgerToGameState, privateStateIdFor, type GameState } from './game-api.js';
import { computeTargetHash } from './hash.js';
import {
  bytesToHex,
  rememberHostGame,
  type GamePrivateState,
} from './private-state.js';

const MANAGED_PATH = new URL('../../contract/managed/guessing-game/', import.meta.url);

export interface CreateGameParams {
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
      'Compact output missing. Compile first: npm run compile (requires the Compact CLI).',
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
      return made.pipe(CC.withWitnesses(witnesses), CC.withCompiledFileAssets(MANAGED_PATH.pathname));
    } catch {
      return made.pipe(CC.withWitnesses(witnesses));
    }
  }
  const withW = CC.withWitnesses(made, witnesses);
  try {
    return CC.withCompiledFileAssets(withW, MANAGED_PATH.pathname);
  } catch {
    return withW;
  }
}

export async function deployGame(
  providers: GameProviders,
  privateState: GamePrivateState,
  params: CreateGameParams,
) {
  const targetHash = computeTargetHash(params.targetNumber, params.targetSalt);
  const compiledContract = (await compiledGuessingGame(privateState)) as never;
  const deployed = await deployContract(providers as never, {
    compiledContract,
    privateStateId: 'midnightbet:pending-deploy',
    initialPrivateState: privateState,
    args: [
      params.maxPlayers,
      params.rangeMin,
      params.rangeMax,
      params.stakeAmount,
      targetHash,
    ],
  });
  const contractAddress = deployed.deployTxData.public.contractAddress as string;
  rememberHostGame({
    contractAddress,
    targetSaltHex: bytesToHex(params.targetSalt),
    targetNumber: params.targetNumber.toString(),
  });
  await providers.privateStateProvider.set(privateStateIdFor(contractAddress), {
    ...privateState,
    targetSalt: params.targetSalt,
    targetNumber: params.targetNumber,
  });
  return { deployed, contractAddress, targetHash };
}

export async function connectToGame(
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

export type DeployedGame = Awaited<ReturnType<typeof connectToGame>>;

export async function readGameState(
  providers: GameProviders,
  contractAddress: string,
): Promise<GameState> {
  const generated = await loadGenerated();
  const publicStates = await getPublicStates(providers as never, contractAddress);
  const ledgerData = generated.ledger((publicStates as { contractState: { data: unknown } }).contractState.data as never);
  return ledgerToGameState(ledgerData);
}

export function subscribeGameState(
  providers: GameProviders,
  contractAddress: string,
  onState: (state: GameState) => void,
  onError?: (err: Error) => void,
): () => void {
  const observable = providers.publicDataProvider.contractStateObservable?.(
    contractAddress,
    { type: 'latest' } as never,
  );
  if (!observable?.subscribe) {
    const timer = setInterval(() => {
      readGameState(providers, contractAddress).then(onState).catch((e) => onError?.(e));
    }, 4000);
    void readGameState(providers, contractAddress).then(onState).catch((e) => onError?.(e));
    return () => clearInterval(timer);
  }
  const sub = observable.subscribe({
    next: async (contractState: { data?: unknown }) => {
      try {
        const generated = await loadGenerated();
        onState(ledgerToGameState(generated.ledger((contractState as { data: unknown }).data as never)));
      } catch (e) {
        onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    },
    error: (e: unknown) => onError?.(e instanceof Error ? e : new Error(String(e))),
  });
  return () => sub.unsubscribe?.();
}

export async function callFaucet(deployed: DeployedGame) {
  return deployed.callTx.faucet();
}

export async function callJoinGame(deployed: DeployedGame) {
  return deployed.callTx.joinGame();
}

export async function callGuess(deployed: DeployedGame, number: bigint) {
  return deployed.callTx.guess(number);
}

export async function callDeclareWinner(
  deployed: DeployedGame,
  playerBytesHex: string,
  targetNumber: bigint,
) {
  const bytes = new Uint8Array(playerBytesHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(playerBytesHex.slice(i * 2, i * 2 + 2), 16);
  }
  return deployed.callTx.declareWinner({ bytes }, targetNumber);
}

export async function callGiveUp(deployed: DeployedGame) {
  return deployed.callTx.giveUp();
}

export async function callCancelGame(deployed: DeployedGame) {
  return deployed.callTx.cancelGame();
}

export async function callClaimRefund(deployed: DeployedGame) {
  return deployed.callTx.claimRefund();
}
