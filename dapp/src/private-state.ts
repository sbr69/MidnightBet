export const SECRET_KEY_STORAGE = 'midnightbet:secretKey';
export const HOST_GAMES_STORAGE = 'midnightbet:hostGames';

export interface GamePrivateState {
  secretKey: Uint8Array;
  targetSalt?: Uint8Array;
  targetNumber?: bigint;
}

export interface HostGameRecord {
  contractAddress?: string;
  roomCode: string;
  targetSaltHex: string;
  targetNumber: string;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function loadOrCreateSecretKey(): Uint8Array {
  if (typeof localStorage === 'undefined') {
    return crypto.getRandomValues(new Uint8Array(32));
  }
  const existing = localStorage.getItem(SECRET_KEY_STORAGE);
  if (existing && existing.length >= 64) {
    return hexToBytes(existing);
  }
  const secretKey = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(SECRET_KEY_STORAGE, bytesToHex(secretKey));
  return secretKey;
}

export function rememberHostGame(record: HostGameRecord): void {
  if (typeof localStorage === 'undefined') return;
  const all = listHostGames();
  const next = [
    record,
    ...all.filter(
      (g) =>
        (record.roomCode && g.roomCode !== record.roomCode) ||
        (record.contractAddress && g.contractAddress !== record.contractAddress),
    ),
  ];
  localStorage.setItem(HOST_GAMES_STORAGE, JSON.stringify(next));
}

export function listHostGames(): HostGameRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOST_GAMES_STORAGE);
    return raw ? (JSON.parse(raw) as HostGameRecord[]) : [];
  } catch {
    return [];
  }
}

export function hostRecordFor(identifier: string): HostGameRecord | undefined {
  const clean = identifier.trim().toUpperCase();
  return listHostGames().find(
    (g) =>
      (g.roomCode && g.roomCode.toUpperCase() === clean) ||
      (g.contractAddress && g.contractAddress === identifier),
  );
}

export function privateStateFor(identifier?: string): GamePrivateState {
  const secretKey = loadOrCreateSecretKey();
  if (!identifier) return { secretKey };
  const host = hostRecordFor(identifier);
  if (!host) return { secretKey };
  return {
    secretKey,
    targetSalt: hexToBytes(host.targetSaltHex),
    targetNumber: BigInt(host.targetNumber),
  };
}
