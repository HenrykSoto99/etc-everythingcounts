let volatileToken: string | null = null;
const key = 'etc-account-token';
export function getAccountToken(): string | null {
  try { return window.sessionStorage.getItem(key) || volatileToken; } catch { return volatileToken; }
}
export function saveAccountToken(token: string) {
  volatileToken = token;
  try { window.sessionStorage.setItem(key, token); } catch { /* Use the volatile authenticated token, not a fake identity. */ }
}
export function clearAccountToken() {
  volatileToken = null;
  try { window.sessionStorage.removeItem(key); } catch { /* no-op */ }
}
export async function logoutAccount() {
  const token = getAccountToken();
  try { await fetch('/api/etc/auth/logout', { method: 'POST', credentials: 'include', headers: { 'X-ETC-Intent': 'workspace', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }); }
  finally { clearAccountToken(); }
}
