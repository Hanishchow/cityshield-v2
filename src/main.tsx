import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/montserrat';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import App from './app/App.tsx';
import { registerServiceWorker } from './lib/pwa.ts';
import { useUI } from './store/ui.ts';
import { installErrorReporting } from './lib/errorReport.ts';

installErrorReporting();

/* Indic scripts load on demand: only when the user picks that language. */
const INDIC = {
  kn: () => import('@fontsource-variable/noto-sans-kannada'),
  hi: () => import('@fontsource-variable/noto-sans-devanagari'),
  ta: () => import('@fontsource-variable/noto-sans-tamil'),
  te: () => import('@fontsource-variable/noto-sans-telugu'),
} as const;
const loadFont = (l: string) => { if (l in INDIC) void INDIC[l as keyof typeof INDIC](); };
loadFont(useUI.getState().lang);
useUI.subscribe((s, p) => { if (s.lang !== p.lang) loadFont(s.lang); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
registerServiceWorker();
