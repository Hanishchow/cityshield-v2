import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Phone } from 'lucide-react';
import { Tooltip } from 'radix-ui';
import { initConnection, onBackendSwitch, useConn } from '@/lib/api/connection.ts';
import { useLiveBridge, useMe } from '@/lib/api/hooks.ts';
import { resolvedTheme, useUI } from '@/store/ui.ts';
import { ShieldMark } from '@/components/brand/Logo.tsx';
import { Skeleton } from '@/components/ui/controls.tsx';
import { Shell } from './Shell.tsx';
import { Overlays } from './Overlays.tsx';
import { Sheets } from './Sheets.tsx';
import Home from '@/routes/Home.tsx';

const Sos = lazy(() => import('@/routes/Sos.tsx'));
const Service = lazy(() => import('@/routes/Service.tsx'));
const Track = lazy(() => import('@/routes/Track.tsx'));
const Complaints = lazy(() => import('@/routes/Complaints.tsx'));
const ComplaintDetail = lazy(() => import('@/routes/Complaints.tsx').then((m) => ({ default: m.ComplaintDetail })));
const MyComplaints = lazy(() => import('@/routes/Complaints.tsx').then((m) => ({ default: m.MyComplaints })));
const Report = lazy(() => import('@/routes/Report.tsx'));
const Notifications = lazy(() => import('@/routes/Notifications.tsx'));
const Profile = lazy(() => import('@/routes/Account.tsx').then((m) => ({ default: m.Profile })));
const Settings = lazy(() => import('@/routes/Account.tsx').then((m) => ({ default: m.Settings })));
const Places = lazy(() => import('@/routes/Account.tsx').then((m) => ({ default: m.Places })));
const Help = lazy(() => import('@/routes/Info.tsx').then((m) => ({ default: m.Help })));
const About = lazy(() => import('@/routes/Info.tsx').then((m) => ({ default: m.About })));
const Command = lazy(() => import('@/routes/Command.tsx'));
const NotFound = lazy(() => import('@/routes/NotFound.tsx'));

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 10_000 } },
});
onBackendSwitch(() => { qc.clear(); });

/** Never a blank screen: any render error still leaves 112 one tap away. */
class RouteBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-8 text-center">
        <ShieldMark className="h-16 w-14" />
        <h1 className="text-[20px] font-extrabold">Something went wrong on this screen</h1>
        <p className="max-w-[360px] text-[13.5px] text-fg-2">{this.state.error.message}</p>
        <div className="flex gap-3">
          <button className="rounded-xl bg-primary px-4 py-2.5 font-bold text-white" onClick={() => { this.setState({ error: null }); location.assign(import.meta.env.BASE_URL); }}>Reload</button>
          <a className="inline-flex items-center gap-2 rounded-xl bg-sos px-4 py-2.5 font-bold text-white" href="tel:112"><Phone className="size-4" />Call 112</a>
        </div>
      </div>
    );
  }
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[radial-gradient(120%_80%_at_50%_30%,var(--navy-800),var(--navy-950))]">
      <div className="flex flex-col items-center gap-5">
        <ShieldMark className="h-24 w-[86px] animate-[pulse_2s_ease-in-out_infinite]" glow />
        <div className="text-[19px] font-extrabold tracking-[0.12em] text-white">CITY SHIELD</div>
        <a href="tel:112" className="mt-6 rounded-full bg-sos/90 px-4 py-1.5 text-[12.5px] font-bold text-white">Emergency? Call 112</a>
      </div>
    </div>
  );
}

/** Applies theme + language, and adopts the account's saved preferences on first load. */
function Sync() {
  const theme = useUI((s) => s.theme), lang = useUI((s) => s.lang), set = useUI((s) => s.set);
  const me = useMe().data;
  useLiveBridge();
  useEffect(() => {
    const apply = () => {
      const r = resolvedTheme(theme);
      document.documentElement.setAttribute('data-theme', r);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', r === 'dark' ? '#050B1E' : '#0B1533');
    };
    apply();
    const m = matchMedia('(prefers-color-scheme: dark)');
    m.addEventListener('change', apply);
    return () => m.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => { document.documentElement.lang = lang === 'en' ? 'en-IN' : `${lang}-IN`; }, [lang]);
  useEffect(() => {
    if (!me) return;
    try { if (!localStorage.getItem('cs-ui')) set({ theme: me.theme, lang: me.lang }); } catch { /* ignore */ }
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const Page = ({ children }: { children: ReactNode }) => (
  <RouteBoundary><Suspense fallback={<div className="flex flex-col gap-4 p-6"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>}>{children}</Suspense></RouteBoundary>
);

export default function App() {
  const ready = useConn((s) => s.backend);
  useEffect(() => { void initConnection(); }, []);
  if (!ready) return <Splash />;
  return (
    <QueryClientProvider client={qc}>
      <Tooltip.Provider delayDuration={300}>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Sync />
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Page><Home /></Page>} />
              <Route path="sos" element={<Page><Sos /></Page>} />
              <Route path="service/:key" element={<Page><Service /></Page>} />
              <Route path="track" element={<Page><Track /></Page>} />
              <Route path="complaints" element={<Page><Complaints /></Page>} />
              <Route path="complaints/mine" element={<Page><MyComplaints /></Page>} />
              <Route path="complaints/new/:cat?" element={<Page><Report /></Page>} />
              <Route path="complaints/:id" element={<Page><ComplaintDetail /></Page>} />
              <Route path="notifications" element={<Page><Notifications /></Page>} />
              <Route path="places" element={<Page><Places /></Page>} />
              <Route path="profile" element={<Page><Profile /></Page>} />
              <Route path="settings" element={<Page><Settings /></Page>} />
              <Route path="help" element={<Page><Help /></Page>} />
              <Route path="about" element={<Page><About /></Page>} />
              <Route path="command" element={<Page><Command /></Page>} />
              <Route path="*" element={<Page><NotFound /></Page>} />
            </Route>
          </Routes>
          <Overlays />
          <Sheets />
          <Toaster position="bottom-center" offset={88} mobileOffset={88} gap={8} />
        </BrowserRouter>
      </Tooltip.Provider>
    </QueryClientProvider>
  );
}
