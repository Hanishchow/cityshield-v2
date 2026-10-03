/**
 * Builds the single-file pitch prototype.
 *
 *   npm run prototype:build
 *
 * Inlines prototype/src/*.css and *.js into ONE self-contained HTML file at
 * public/demo/index.html. Vite copies public/ as-is, so the prototype is served
 * next to the React app without going through the React build:
 *   dev     http://localhost:5178/demo/index.html
 *   deploy  https://hanishchow.github.io/cityshield/demo/
 *
 * No dependencies. Edit the files in prototype/src, then re-run this script.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'src');
const OUT = join(HERE, '..', 'public', 'demo', 'index.html');
const read = (f) => readFileSync(join(SRC, f), 'utf8');

const css = ['styles.css', 'extra.css'].map(read).join('\n');
const js = ['core.js', 'art.js', 'map.js', 'pages_a.js', 'pages_b.js', 'app.js'].map(read).join('\n');

/* A literal closing tag inside the inlined code would end the element early. */
if (/<\/script/i.test(js) || /<\/style/i.test(css)) {
  console.error('prototype: source contains a closing script/style tag - cannot inline safely');
  process.exit(1);
}

const html = `<!doctype html>
<html lang="en-IN" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>City Shield · Safer Cities. Stronger Communities.</title>
<meta name="description" content="City Shield — one-tap emergency help and civic complaints for Bengaluru. Interactive prototype.">
<meta name="theme-color" content="#0A1A3F">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Kannada:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;600;700&family=Caveat:wght@600&display=swap">
<style>
${css}
</style>
</head>
<body>
<div id="app">
  <aside class="sidebar" id="sb" aria-label="Main navigation"></aside>
  <div class="main">
    <header class="topbar" id="tb"></header>
    <main class="view" id="view"></main>
    <nav class="bnav" id="bn" aria-label="Tabs" hidden></nav>
  </div>
</div>
<div id="layer"></div>
<div id="ovl"></div>
<div class="toasts" id="toasts" aria-live="polite"></div>
<script>
"use strict";
${js}
</script>
</body>
</html>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log(`prototype: wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB)`);
