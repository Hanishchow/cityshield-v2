/**
 * In-process pub/sub for Server-Sent Events: one channel per user, plus the
 * Command Centre channel. A multi-instance deployment would put Postgres
 * LISTEN/NOTIFY (or Redis) behind the same two methods.
 */
import type { StreamEvent } from '../../shared/contract.ts';

type Send = (e: StreamEvent) => void;

export class Hub {
  private users = new Map<string, Set<Send>>();
  private ops = new Set<Send>();

  subscribe(userId: string, send: Send) {
    let s = this.users.get(userId);
    if (!s) { s = new Set(); this.users.set(userId, s); }
    s.add(send);
    return () => { s!.delete(send); if (!s!.size) this.users.delete(userId); };
  }
  subscribeOps(send: Send) { this.ops.add(send); return () => { this.ops.delete(send); }; }

  /** userId null = Command Centre broadcast. */
  publish(userId: string | null, e: StreamEvent) {
    const targets = userId ? this.users.get(userId) : this.ops;
    targets?.forEach((send) => { try { send(e); } catch { /* client gone; its close handler cleans up */ } });
  }
  get openStreams() { let n = this.ops.size; this.users.forEach((s) => { n += s.size; }); return n; }
}
