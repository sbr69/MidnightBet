/**
 * Local helpers. Does not deploy or submit transactions.
 *   npx tsx src/cli.ts hash --min 1 --max 100
 */

import { computeTargetHash, generateTargetNumber } from './hash.js';

const args = process.argv.slice(2);
const cmd = args[0] ?? 'help';

if (cmd === 'hash') {
  const min = BigInt(argValue('--min') ?? '1');
  const max = BigInt(argValue('--max') ?? '100');
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const target = generateTargetNumber(min, max);
  const hash = computeTargetHash(target, salt);
  console.log({
    target: target.toString(),
    salt: Buffer.from(salt).toString('hex'),
    targetHash: Buffer.from(hash).toString('hex'),
  });
} else {
  console.log(`MidnightBet CLI
  hash [--min 1] [--max 100]   Compute a persistentCommit matching the Compact contract
  (Deploy from the browser after npm run compile. This CLI does not submit txs.)`);
}

function argValue(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}
