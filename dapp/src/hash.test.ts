import { describe, expect, test } from 'vitest';
import {
  computeTargetHash,
  generateTargetNumber,
  generateRoomCode,
  codeToRoomId,
  roomIdToCode,
} from '../src/hash.ts';

describe('target commitment & room codes', () => {
  test('persistentCommit returns 32 bytes and is deterministic', () => {
    const salt = new Uint8Array(32);
    salt[0] = 7;
    const a = computeTargetHash(42n, salt);
    const b = computeTargetHash(42n, salt);
    expect(a.length).toBe(32);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  test('different targets produce different commitments', () => {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const a = computeTargetHash(1n, salt);
    const b = computeTargetHash(2n, salt);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  test('generateTargetNumber stays in range', () => {
    for (let i = 0; i < 20; i++) {
      const n = generateTargetNumber(1n, 10n);
      expect(n >= 1n && n <= 10n).toBe(true);
    }
  });

  test('generateRoomCode produces a 6-character uppercase alphanumeric string', () => {
    for (let i = 0; i < 10; i++) {
      const code = generateRoomCode();
      expect(code.length).toBe(6);
      expect(/^[A-Z2-9]{6}$/.test(code)).toBe(true);
    }
  });

  test('codeToRoomId produces 32 bytes and round-trips with roomIdToCode', () => {
    const code = 'K7X9PQ';
    const roomId = codeToRoomId(code);
    expect(roomId.length).toBe(32);
    expect(roomIdToCode(roomId)).toBe('K7X9PQ');
  });
});
