/**
 * Live text derived from an assignment and the server clock — the React
 * equivalent of the prototype's data-bind="eta:…" elements.
 */
import type { Assignment } from '@shared/contract.ts';
import { SERVICES } from '@shared/catalog.ts';
import { progressOf, type Progress } from '@shared/progress.ts';
import { serverNow } from '@/lib/api/connection.ts';
import { useTicker } from '@/lib/useMedia.ts';
import { fmtTime } from '@/lib/utils.ts';
import { ProgressBar } from '@/components/ui/controls.tsx';

export function useProgress(a: Assignment | null | undefined, ms = 500): Progress | null {
  useTicker(ms);
  return a ? progressOf(a, serverNow()) : null;
}

export const etaText = (pr: Progress | null) => (!pr ? '—' : pr.done ? 'Arrived' : `${pr.etaMin} min`);
export const statusText = (pr: Progress | null) => (!pr ? 'Not active · tap to request' : pr.done ? 'Arrived' : `En route · ${pr.km} km away`);
export const arrivalText = (pr: Progress | null) => (!pr ? '—' : fmtTime(pr.arrivalAt));

export function Eta({ a, className }: { a: Assignment | null; className?: string }) {
  const pr = useProgress(a);
  return <span className={className}>{etaText(pr)}</span>;
}
export function Status({ a, className }: { a: Assignment | null; className?: string }) {
  const pr = useProgress(a);
  return <span className={className}>{statusText(pr)}</span>;
}
export function Arrival({ a, className }: { a: Assignment | null; className?: string }) {
  const pr = useProgress(a);
  return <span className={className}>{arrivalText(pr)}</span>;
}
export function Km({ a, className }: { a: Assignment | null; className?: string }) {
  const pr = useProgress(a);
  return <span className={className}>{!pr ? '—' : pr.done ? '0 km' : `${pr.km} km`}</span>;
}
export function Label({ a, className }: { a: Assignment; className?: string }) {
  const pr = useProgress(a)!;
  return <span className={className}>{pr.done ? SERVICES[a.kind].arrived : SERVICES[a.kind].label(pr.km)}</span>;
}
export function Fill({ a, className }: { a: Assignment | null; className?: string }) {
  const pr = useProgress(a, 300);
  return <ProgressBar className={className} value={pr ? (pr.done ? 100 : pr.p * 100) : 0} color={a ? SERVICES[a.kind].color : 'var(--border)'} />;
}
