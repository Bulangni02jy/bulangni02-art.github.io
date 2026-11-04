import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { resolve, relative, dirname, extname } from 'node:path';
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const require = createRequire(resolve(process.env.SHARP_MODULE_ROOT || resolve(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node'), 'loader.cjs'));
const sharp = require('sharp');
const root = resolve(process.argv[2] || 'motion-prototype');
const images = [], map = new Map();
let originalBytes = 0, viewBytes = 0, thumbBytes = 0;
async function scan(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.name === 'optimized') continue;
    const path = resolve(directory, item.name);
    if (item.isDirectory()) await scan(path);
    else if (/\.(png|jpe?g)$/i.test(item.name)) images.push(path);
  }
}
await scan(resolve(root, 'assets'));
for (const path of images) {
  const data = await readFile(path);
  const name = relative(root, path).replaceAll('\\', '/');
  const hash = createHash('sha256').update(data).digest('hex').slice(0, 10);
  const stem = 'assets/optimized/' + name.slice(7).replace(/\.[^.]+$/, '') + '-' + hash;
  const view = stem + '-view.webp', thumb = stem + '-thumb.webp';
  await mkdir(dirname(resolve(root, view)), { recursive: true });
  const atlas = name.endsWith('/page-objects-v1.png');
  const hero = /\/(desktop|cover|pages)\.png$/.test(name);
  let pipeline = sharp(data).rotate();
  if (!atlas) pipeline = pipeline.resize({ width: hero ? 1600 : 1800, height: 16000, fit: 'inside', withoutEnlargement: true });
  await pipeline.webp(atlas ? { lossless: true, effort: 4 } : { quality: hero ? 83 : 85, alphaQuality: 95, effort: 4 }).toFile(resolve(root, view));
  await sharp(data).rotate().resize({ width: 540, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 76, effort: 4 }).toFile(resolve(root, thumb));
  map.set(name, { view, thumb });
  originalBytes += data.length;
  viewBytes += (await stat(resolve(root, view))).size;
  thumbBytes += (await stat(resolve(root, thumb))).size;
}
const worksPath = resolve(root, 'assets/design-works.json');
const works = JSON.parse(await readFile(worksPath, 'utf8'));
for (const work of works) {
  if (work.cover) {
    const original = work.originalCover || work.cover;
    work.originalCover = original;
    work.cover = map.get(original)?.view || original;
  }
  for (const image of work.images) {
    const original = image.originalSrc || image.src;
    image.originalSrc = original;
    image.src = map.get(original)?.view || original;
  }
  const lead = work.originalCover || work.images[0].originalSrc;
  work.thumbnail = map.get(lead)?.thumb || work.cover || work.images[0].src;
}
await writeFile(worksPath, JSON.stringify(works, null, 2) + '\n');
// Only replace references in HTML/CSS; downloads keep the original source paths.
for (const file of await readdir(root)) {
  if (!['.html', '.css'].includes(extname(file))) continue;
  const path = resolve(root, file);
  let text = await readFile(path, 'utf8');
  for (const [original, optimized] of map) text = text.replaceAll(original, optimized.view);
  await writeFile(path, text);
}
const core = ['desktop.png', 'cover.png', 'pages.png', 'page-objects-v1.png', 'profile-hu-jiayu.jpg'];
const coreBefore = await Promise.all(core.map(name => stat(resolve(root, 'assets', name))));
const coreAfter = await Promise.all(core.map(name => stat(resolve(root, map.get('assets/' + name).view))));
console.log(JSON.stringify({ images: images.length, originalBytes, viewBytes, thumbBytes, coreBeforeBytes: coreBefore.reduce((n, x) => n + x.size, 0), coreAfterBytes: coreAfter.reduce((n, x) => n + x.size, 0), originalsPreserved: true }, null, 2));
