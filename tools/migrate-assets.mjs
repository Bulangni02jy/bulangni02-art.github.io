import { readFile, mkdir, stat, rename, unlink } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { createHash } from 'node:crypto';
const assets = JSON.parse(await readFile('tools/assets.json', 'utf8'));
async function verify(path, asset) {
  if ((await stat(path)).size !== asset.bytes) return false;
  const hash = createHash('sha256');
  for await (const data of createReadStream(path)) hash.update(data);
  return hash.digest('hex') === asset.sha256;
}
async function transfer(asset) {
  if (!asset.path.startsWith('assets/') || asset.path.split('/').includes('..')) throw Error('Invalid asset path');
  const target = resolve('site', asset.path);
  try {
    if (!await verify(target, asset)) throw Error(`Existing asset differs: ${asset.path}`);
    return;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (new URL(asset.url).origin !== 'https://app-xl15.pocketbay.app') throw Error('Unexpected source host');
  await mkdir(dirname(target), { recursive: true });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(asset.url, { signal: AbortSignal.timeout(180000) });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const hash = createHash('sha256');
      await pipeline(Readable.fromWeb(response.body), new Transform({ transform(chunk, encoding, callback) { hash.update(chunk); callback(null, chunk); } }), createWriteStream(target + '.part'));
      if (hash.digest('hex') !== asset.sha256 || (await stat(target + '.part')).size !== asset.bytes) throw Error('Asset checksum mismatch');
      await rename(target + '.part', target);
      console.log(`Verified ${asset.path}`);
      return;
    } catch (error) {
      await unlink(target + '.part').catch(() => {});
      if (attempt === 2) throw new Error(`${asset.path}: ${error.message}`);
      await new Promise(done => setTimeout(done, 2000 * (attempt + 1)));
    }
  }
}
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => { while (next < assets.length) await transfer(assets[next++]); }));
console.log(`All ${assets.length} assets verified. Future deployments use the repository copies.`);
