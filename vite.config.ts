/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// GitHub Pages serves this project from https://<user>.github.io/cityshield/,
// so the BUILD is emitted under that sub-path. Dev serves from the root.
// Override either with BASE_PATH, e.g. BASE_PATH=/ for root-domain hosting.
//
// The original pitch prototype is still served at /demo/ (public/demo/index.html,
// built by prototype/build.mjs) as the visual reference for this app. Vite does
// not resolve directory indexes inside public/, so /demo and /demo/ are
// rewritten to the file itself.
const demoIndex = (): Plugin => {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const [path, query] = (req.url ?? '').split('?');
    if (/\/demo\/?$/.test(path)) {
      req.url = path.replace(/\/demo\/?$/, '/demo/index.html') + (query ? `?${query}` : '');
    }
    next();
  };
  return {
    name: 'demo-index',
    /* Block bodies on purpose: a hook that RETURNS a function is treated by
       Vite as a post-middleware hook. */
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
};

/**
 * Where the dev/preview servers proxy /v1, /health and /docs. Default: a local
 * API on 8787. Set API_ORIGIN in .env.local to use a remote one, e.g. the
 * celure deployment: API_ORIGIN=http://100.93.157.65:8788
 */
export default defineConfig(({ command, mode }) => {
  const API = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '').API_ORIGIN || 'http://127.0.0.1:8787';
  const proxy = {
    '/v1': { target: API, changeOrigin: true },
    '/health': { target: API, changeOrigin: true },
    '/docs': { target: API, changeOrigin: true },
  };
  return {
  base: process.env.BASE_PATH ?? (command === 'build' ? '/cityshield/' : '/'),
  plugins: [react(), tailwindcss(), demoIndex()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  /* Tailwind v4 runs as a Vite plugin. An explicit (empty) PostCSS config stops
     Vite from searching parent folders and picking up an unrelated one. */
  css: { postcss: { plugins: [] } },
  server: { port: 5178, proxy },
  preview: { port: 4178, proxy },
  build: {
    /* Production source maps hand anyone with devtools the original sources;
       stated here rather than inherited silently. */
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts'],
  },
  };
});
