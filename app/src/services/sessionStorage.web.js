/* eslint-env browser */
const key = 'vikash.session';
export async function loadSession() {
  const value = sessionStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}
export async function storeSession(session) {
  sessionStorage.setItem(key, JSON.stringify({ accessToken: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt }));
}
export async function clearSession() { sessionStorage.removeItem(key); }
