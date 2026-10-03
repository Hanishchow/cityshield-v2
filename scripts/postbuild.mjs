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
 *  - Writes sitemap.xml + robots.txt when SITE_URL is set (the Pages workflow
 *    sets it to https://<owner>.github.io/<repo>/).
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
const site = process.env.SITE_URL?.replace(/\/?$/, '/');
if (site) {
  /* Public, indexable screens only — personal pages (profile, notifications, complaint details) are left out. */
  const pages = [['', '1.0', 'daily'], ['sos', '0.9', 'monthly'], ['service/police', '0.8', 'monthly'], ['service/ambulance', '0.8', 'monthly'],
    ['service/fire', '0.8', 'monthly'], ['service/civic', '0.8', 'monthly'], ['complaints', '0.7', 'weekly'], ['track', '0.6', 'weekly'],
    ['help', '0.6', 'monthly'], ['about', '0.5', 'monthly'], ['command', '0.4', 'weekly'], ['demo/', '0.3', 'yearly']];
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.map(([p, pr, f]) => `  <url><loc>${site}${p}</loc><lastmod>${today}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`);
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n');
  writeFileSync(join(DIST, 'sitemap.xml'), xml);
  const path = new URL(site).pathname;
  const robots = ['User-agent: *', 'Allow: /', `Disallow: ${path}profile`, `Disallow: ${path}notifications`, `Sitemap: ${site}sitemap.xml`, ''].join('\n');
  writeFileSync(join(DIST, 'robots.txt'), robots);
}
console.log(`postbuild: BUILD_ID=${id}, 404.html + .nojekyll${site ? ' + sitemap.xml + robots.txt' : ''} written`);
