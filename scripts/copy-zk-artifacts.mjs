import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const managed = path.join(root, 'contract', 'managed', 'guessing-game');
const dest = path.join(root, 'frontend', 'public');

function copyDir(from, to) {
  if (!fs.existsSync(from)) return false;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const out = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, out);
    else fs.copyFileSync(src, out);
  }
  return true;
}

const keysOk = copyDir(path.join(managed, 'keys'), path.join(dest, 'keys'));
const zkirOk = copyDir(path.join(managed, 'zkir'), path.join(dest, 'zkir'));
if (!keysOk || !zkirOk) {
  console.warn(
    'No compiled Compact artifacts under contract/managed/guessing-game. Run npm run compile first.',
  );
} else {
  console.log('Copied keys/ and zkir/ into frontend/public for FetchZkConfigProvider.');
}
