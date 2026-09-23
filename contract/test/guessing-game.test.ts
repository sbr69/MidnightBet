import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const managed = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../managed/guessing-game/contract/index.js',
);

describe('MidnightBet Compact contract (Single Hub Architecture)', () => {
  test('source checks for room-based structure', () => {
    const src = fs.readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/guessing-game.compact'),
      'utf8',
    );
    expect(src).toContain('createRoom');
    expect(src).toContain('joinRoom');
    expect(src).toContain('cancelRoom');
    expect(src).toContain('roomPlayerKey');
    expect(src).toContain('persistentCommit<Uint<64>>(targetNumber, salt)');
  });

  test('compiled JS is present and exposes Contract and pureCircuits', async () => {
    expect(fs.existsSync(managed)).toBe(true);
    const mod = await import(managed);
    expect(mod.Contract).toBeDefined();
    expect(mod.pureCircuits).toBeDefined();
    expect(typeof mod.pureCircuits.deriveUserPublicKey).toBe('function');
    expect(typeof mod.pureCircuits.roomPlayerKey).toBe('function');

    // Test pure circuit: derive public key from 32-byte secret key
    const secretKey = new Uint8Array(32).fill(7);
    const publicKey = mod.pureCircuits.deriveUserPublicKey({ bytes: secretKey });
    expect(publicKey).toBeDefined();
    expect(publicKey.bytes).toBeInstanceOf(Uint8Array);
    expect(publicKey.bytes.length).toBe(32);

    // Test pure circuit: roomPlayerKey
    const roomId = new Uint8Array(32).fill(1);
    const playerKey = mod.pureCircuits.roomPlayerKey(roomId, publicKey);
    expect(playerKey).toBeInstanceOf(Uint8Array);
    expect(playerKey.length).toBe(32);

    // Verify Contract instance has all hub circuits defined
    const contract = new mod.Contract({
      getUserSecret: () => [undefined, { bytes: secretKey }],
      getTargetSalt: () => [undefined, new Uint8Array(32)],
    });
    expect(contract.circuits).toBeDefined();
    expect(contract.circuits.faucet).toBeDefined();
    expect(contract.circuits.createRoom).toBeDefined();
    expect(contract.circuits.joinRoom).toBeDefined();
    expect(contract.circuits.guess).toBeDefined();
    expect(contract.circuits.declareWinner).toBeDefined();
    expect(contract.circuits.giveUp).toBeDefined();
    expect(contract.circuits.cancelRoom).toBeDefined();
    expect(contract.circuits.claimRefund).toBeDefined();
  });
});
