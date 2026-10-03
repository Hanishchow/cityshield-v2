/**
 * Runs after `vite build`.
 *
 *  - Stamps a unique BUILD_ID into dist/sw.js. A service worker is only
 *    reinstalled when its own bytes change, so a constant version would keep
 *    users on the previous build until they hard-reload.
 *  - Copies index.html to 404.html. GitHub Pages has no SPA fallback: a deep
 *    link such as /cityshield/complaints/CS-2041 would 404. Pages serves
 *    404.html for unknown paths, and the router takes it from there.
 *  - Writes .nojekyll so Pages serves files whose names start with "_".
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('postbuild: dist/index.html not found — run vite build first');
  process.exit(1);
}

const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const sw = join(DIST, 'sw.js');
if (existsSync(sw)) {
  const src = readFileSync(sw, 'utf8');
  if (!src.includes('__BUILD_ID__')) console.warn('postbuild: sw.js has no __BUILD_ID__ placeholder');
  writeFileSync(sw, src.replaceAll('__BUILD_ID__', id));
}
copyFileSync(join(DIST, 'index.html'), join(DIST, '404.html'));
writeFileSync(join(DIST, '.nojekyll'), '');
console.log(`postbuild: BUILD_ID=${id}, 404.html + .nojekyll written`);
