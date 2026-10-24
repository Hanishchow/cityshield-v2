/**
 * In-process pub/sub for Server-Sent Events: one channel per user, plus the
 * Command Centre channel. A multi-instance deployment would put Postgres
 * LISTEN/NOTIFY (or Redis) behind the same two methods.
 *
 * Command Centre subscribers are either operators (see everything) or, in a
 * demo deployment, anonymous visitors, who only ever receive events about
 * city records that have no citizen behind them. A citizen's case is visible
 * to that citizen and to operators, never to the public.
 */
import type { StreamEvent } from '../../shared/contract.ts';

type Send = (e: StreamEvent) => void;

/** True when the event carries a citizen's record (or a notification addressed to one). */
export function isPersonal(e: StreamEvent): boolean {
  if (e.type === 'incident') return !!e.incident.userId;
  if (e.type === 'complaint') return !!e.complaint.userId;
  return e.type === 'notification';
}

export class Hub {
  private users = new Map<string, Set<Send>>();
  private ops = new Map<Send, { full: boolean }>();

  subscribe(userId: string, send: Send) {
    let s = this.users.get(userId);
    if (!s) { s = new Set(); this.users.set(userId, s); }
    s.add(send);
    return () => { s!.delete(send); if (!s!.size) this.users.delete(userId); };
  }
  /** full = an operator; otherwise only public events are delivered. */
  subscribeOps(send: Send, full: boolean) { this.ops.set(send, { full }); return () => { this.ops.delete(send); }; }

  /** userId null = Command Centre broadcast. */
  publish(userId: string | null, e: StreamEvent) {
    const deliver = (send: Send) => { try { send(e); } catch { /* client gone; its close handler cleans up */ } };
    if (userId) { this.users.get(userId)?.forEach(deliver); return; }
    const personal = isPersonal(e);
    this.ops.forEach((v, send) => { if (v.full || !personal) deliver(send); });
  }
  get openStreams() { let n = this.ops.size; this.users.forEach((s) => { n += s.size; }); return n; }
}
