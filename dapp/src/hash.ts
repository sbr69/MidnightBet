import {
  CompactTypeUnsignedInteger,
  persistentCommit,
} from '@midnight-ntwrk/compact-runtime';

/** Compact `Uint<64>` runtime type: 8-byte field-aligned unsigned integer. */
const UINT64 = new CompactTypeUnsignedInteger((1n << 64n) - 1n, 8);

/**
 * Matches Compact `persistentCommit<Uint<64>>(target, salt)` used as `targetHash` on-chain.
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

/**
 * Generates a random 6-character uppercase alphanumeric room code (e.g. "K7X9PQ").
 */
export function generateRoomCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

/**
 * Converts a room code to a 32-byte UTF-8 array padded with zeroes,
 * matching Compact's `pad(32, code)` representation.
 */
export function codeToRoomId(code: string): Uint8Array {
  const clean = code.trim().toUpperCase();
  const out = new Uint8Array(32);
  const encoded = new TextEncoder().encode(clean);
  out.set(encoded.slice(0, 32));
  return out;
}

/**
 * Converts a 32-byte room ID back to a readable string (strips trailing zero bytes).
 */
export function roomIdToCode(roomId: Uint8Array): string {
  let end = roomId.indexOf(0);
  if (end === -1) end = roomId.length;
  return new TextDecoder().decode(roomId.slice(0, end)).trim();
}
