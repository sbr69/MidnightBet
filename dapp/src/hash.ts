import {
  CompactTypeUnsignedInteger,
  persistentCommit,
} from '@midnight-ntwrk/compact-runtime';

/** Compact `Uint<64>` runtime type: 8-byte field-aligned unsigned integer. */
const UINT64 = new CompactTypeUnsignedInteger((1n << 64n) - 1n, 8);

/**
 * Matches Compact `persistentCommit(target, salt)` used as `targetHash` on-chain.
 */
export function computeTargetHash(targetNumber: bigint, salt: Uint8Array): Uint8Array {
  if (salt.length !== 32) {
    throw new Error('Target salt must be 32 bytes');
  }
  return persistentCommit(UINT64, targetNumber, salt);
}

export function generateTargetNumber(rangeMin: bigint, rangeMax: bigint): bigint {
  const range = Number(rangeMax - rangeMin) + 1;
  const random = crypto.getRandomValues(new Uint32Array(1))[0]!;
  return rangeMin + BigInt(random % range);
}
