/** Production only: a dev service worker would cache Vite's unbundled modules and fight HMR. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => { /* offline-first is a bonus, not a requirement */ });
  });
}
