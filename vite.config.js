import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project from https://<user>.github.io/cityshield/,
// so the BUILD is emitted under that sub-path. `base` feeds import.meta.env
// .BASE_URL, which the router (basename) and the hero manifest both consume.
//
// Dev serves from the root instead. Running the dev server under the deploy
// sub-path meant opening http://localhost:5178 landed on a redirect rather than
// the app, which reads as "the site is broken" for no good reason. The sub-path
// only has to be right where it actually applies, which is the deployed build.
//
// Override either with BASE_PATH, e.g. BASE_PATH=/ for root-domain hosting.
// The pitch prototype is a self-contained page at public/demo/index.html
// (built by prototype/build.mjs). Vite's servers do not resolve directory
// indexes inside public/, so /demo/ would fall through to the React app's SPA
// fallback. This rewrites /demo and /demo/ (under any base) to the file itself.
// GitHub Pages resolves the directory index natively, so the build is unaffected.
const demoIndex = () => {
  const rewrite = (req, _res, next) => {
    const [path, query] = (req.url ?? '').split('?');
    if (/\/demo\/?$/.test(path)) {
      req.url = path.replace(/\/demo\/?$/, '/demo/index.html') + (query ? `?${query}` : '');
    }
    next();
  };
  return {
    name: 'demo-index',
    /* Block bodies on purpose: a hook that RETURNS a function is treated by
       Vite as a post-middleware hook, and use() returns the connect app. */
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
};

export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH ?? (command === 'build' ? '/cityshield/' : '/'),
  plugins: [react(), demoIndex()],
  server: { port: 5178 },
  build: {
    /* Explicit, not left to the default. Production source maps hand anyone who
       opens devtools the original sources; that is a decision worth stating in
       the config rather than inheriting silently. */
    sourcemap: false,
  },
}));
