import { HDWallet, Roles, mnemonicToWords } from '@midnightntwrk/wallet-sdk-hd';
import { mnemonicToSeedSync } from '@scure/bip39';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
const content = fs.readFileSync(envPath, 'utf-8');
const match = content.match(/MY_PREVIEW_MNEMONIC\s*=\s*["']?([^"'\r\n]+)["']?/);
const mnemonic = match![1].trim();

console.log('Validating mnemonic...');
const words = mnemonicToWords(mnemonic);
console.log('Words count:', words.length);

const seed = mnemonicToSeedSync(mnemonic);
const hd = HDWallet.fromSeed(seed);
if (hd.type === 'seedOk') {
  const account = hd.hdWallet.selectAccount(0);
  const nightExtKey = account.selectRole(Roles.NightExternal).deriveKeyAt(0);
  const dustKey = account.selectRole(Roles.Dust).deriveKeyAt(0);
  const zswapKey = account.selectRole(Roles.Zswap).deriveKeyAt(0);
  console.log('NightExternal key type:', nightExtKey.type);
  console.log('Dust key type:', dustKey.type);
  console.log('Zswap key type:', zswapKey.type);
}
