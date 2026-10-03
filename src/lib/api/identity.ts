/** Per-device identity. SOS must work without a sign-in, so every device gets an anonymous session first. */
const DEV_KEY = 'cs-device';
const tokKey = (mode: 'live' | 'offline') => `cs-token-${mode}`;

export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEV_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEV_KEY, id); }
    return id;
  } catch {
    return 'ephemeral-' + Math.random().toString(36).slice(2, 12);
  }
}
export function getToken(mode: 'live' | 'offline'): string | null {
  try { return localStorage.getItem(tokKey(mode)); } catch { return null; }
}
export function setToken(mode: 'live' | 'offline', t: string | null) {
  try { if (t) localStorage.setItem(tokKey(mode), t); else localStorage.removeItem(tokKey(mode)); } catch { /* private mode */ }
}
