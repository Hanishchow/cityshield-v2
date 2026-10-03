import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtTime(d: Date | number): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  let h = x.getHours();
  const m = x.getMinutes(), ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m < 10 ? '0' : ''}${m} ${ap}`;
}
export const fmtTime2 = (d: Date | number) => { const s = fmtTime(d); return s.length < 8 ? '0' + s : s; };

const DAY = 86_400_000;
const dayKey = (t: number) => new Date(t).toDateString();
/** "Today, 9:12 AM" / "Yesterday, 6:40 PM" / "3 Oct, 4:20 PM" */
export function fmtWhen(t: number, now = Date.now()): string {
  if (dayKey(t) === dayKey(now)) return 'Today, ' + fmtTime(t);
  if (dayKey(t) === dayKey(now - DAY)) return 'Yesterday, ' + fmtTime(t);
  if (dayKey(t) === dayKey(now + DAY)) return 'Tomorrow, ' + fmtTime(t);
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + fmtTime(t);
}
export function timeAgo(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}
export function fmtDuration(sec: number | null): string {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}
export function initials(n: string): string {
  return String(n || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
}
export const shortArea = (s: string) => String(s).replace(/,\s*Bengaluru$/, '');
export const firstName = (n: string) => String(n || '').trim().split(/\s+/)[0] || '';

export function clockNow(): string {
  const d = new Date(), p = (n: number) => (n < 10 ? '0' : '') + n;
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

export function vibrate(ms: number | number[]) {
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
}
