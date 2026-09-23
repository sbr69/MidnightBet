export function formatError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  // Always log the raw error so developers can see the real cause
  console.error('[MidnightBet] Raw error:', err);

  if (/wallet not found|lace|1am/i.test(message)) {
    return 'No Midnight wallet detected. Please install 1AM Wallet (1am.xyz) or Lace (lace.io).';
  }
  // Only flag as insufficient funds when the message explicitly says not enough
  if (/insufficient.*(dust|tnight|balance|funds|token)/i.test(message) || /not enough.*(dust|tnight|balance|funds)/i.test(message)) {
    return 'Insufficient DUST or tNIGHT. Request testnet tokens from the faucet at faucet.preview.midnight.network.';
  }
  if (/Compact output missing|compile/i.test(message)) {
    return 'Contract not compiled. Compact compilation artifacts are required.';
  }
  if (/fetch failed|proof-server|6300|connection refused|Failed to fetch/i.test(message)) {
    return 'Could not reach ZK proof server (port 6300). Lace requires a local Docker proof server, or use 1AM Wallet which includes automatic remote ZK proving.';
  }
  if (/182|custom error:\s*182/i.test(message)) {
    return 'Contract not found on Midnight Preview blockchain (Error 182). The central hub contract has not been deployed on-chain yet.';
  }
  return message;
}
