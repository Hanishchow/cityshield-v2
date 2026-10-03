/**
 * Service worker.
 *
 * Strategy per request type, because the wrong one here is dangerous:
 *
 *  - NAVIGATIONS are network-first. The HTML names which fingerprinted bundles
 *    to load, so serving a stale copy points the app at the previous build.
 *  - /assets/* is cache-first, which is safe precisely because those filenames
 *    contain a content hash: a changed file is a different URL, so a cached
 *    entry can never be the wrong version of anything.
 *  - Everything else same-origin is stale-while-revalidate, so a bad entry
 *    heals itself on the next visit instead of being pinned forever.
 *  - API calls are NETWORK-ONLY. Never serve a cached incident: showing someone
 *    "ambulance en route" for an incident that was cancelled is worse than
 *    showing nothing.
 *
 * BUILD_ID is rewritten by scripts/postbuild.mjs on every build. That matters
 * more than it looks: a service worker is only reinstalled when its own bytes
 * change. With a hardcoded version the file stayed identical across deploys, so
 * `activate` never ran, old caches were never purged, and users kept being
 * served the previous build until they hard-reloaded.
 */

const BUILD_ID = '__BUILD_ID__';
const SHELL = `shell-${BUILD_ID}`;
const TILES = `tiles-${BUILD_ID}`;
const TILE_LIMIT = 260;

self.addEventListener('install', (event) => {
  /* Only the entry document is precached. Vite fingerprints everything else, so
     listing those here would go stale on the next build. */
  /* Same trap as the navigation branch: addAll() goes through the HTTP cache,
     so precaching plain './index.html' right after a deploy can store the
     previous build's HTML. Requesting with cache 'reload' forces the network. */
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) =>
        c.addAll([
          new Request('./', { cache: 'reload' }),
          new Request('./index.html', { cache: 'reload' }),
        ]),
      )
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.endsWith(BUILD_ID)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* The pitch prototype under /demo/ is a separate, self-contained page. Stay
     out of its way: the navigation branch below caches every navigated document
     as './index.html', so letting /demo/ through would overwrite the app shell's
     offline fallback with the prototype. */
  if (url.pathname.includes('/demo/')) return;

  /* Anything reporting live state is never served from cache. */
  if (url.pathname.includes('/v1/') || url.pathname.endsWith('/health')) return;

  if (url.hostname.endsWith('maptiler.com') || url.hostname.endsWith('mappls.com')) {
    event.respondWith(
      caches.open(TILES).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) {
          cache.put(request, res.clone());
          trimCache(TILES, TILE_LIMIT);
        }
        return res;
      }),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      /* `cache: 'no-store'` is the whole point of this branch.
         GitHub Pages serves index.html with Cache-Control: max-age=600, and a
         plain fetch() honours the browser HTTP cache. So for ten minutes after a
         deploy the worker was handed the PREVIOUS index.html, which names
         content-hashed bundles that no longer exist: the app booted against a
         dead chunk and rendered nothing. The HTML is the one file that must
         always come from the network, because it decides which bundles load. */
      fetch(request, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* Content-hashed and therefore immutable: cache-first is free correctness. */
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.open(SHELL).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  /* Everything else: serve what we have, but always refresh in the background so
     a stale entry survives at most one visit. */
  event.respondWith(
    caches.open(SHELL).then(async (cache) => {
      const hit = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
