declare module '../../contract/managed/guessing-game/contract/index.js' {
  export class Contract<PrivateState = unknown> {
    constructor(witnesses: unknown);
  }
  export type Ledger = {
    gamePhase: number;
    maxPlayers: bigint | number;
    currentPlayerCount: bigint | number;
    rangeMin: bigint | number;
    rangeMax: bigint | number;
    stakeAmount: bigint | number;
    totalPool: bigint | number;
    targetHash: Uint8Array;
    winner: { bytes: Uint8Array };
    creator: { bytes: Uint8Array };
    currentRound: bigint | number;
    totalGuessCount: bigint | number;
    players: Iterable<[{ bytes: Uint8Array }, boolean]>;
    balances: Iterable<[{ bytes: Uint8Array }, bigint | number]>;
    lastGuessedRound: Iterable<[{ bytes: Uint8Array }, bigint | number]>;
    latestGuesses: Iterable<[{ bytes: Uint8Array }, bigint | number]>;
    hasGivenUp: Iterable<[{ bytes: Uint8Array }, boolean]>;
    giveUpCount: bigint | number;
    roundStartGuessCount: bigint | number;
  };
  export type Witnesses<PrivateState> = {
    getUserSecret: (ctx: unknown) => [PrivateState, { bytes: Uint8Array }];
    getTargetSalt: (ctx: unknown) => [PrivateState, Uint8Array];
  };
  export function ledger(data: unknown): Ledger;
}
