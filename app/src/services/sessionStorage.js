import * as SecureStore from 'expo-secure-store';

const key = 'vikash.session';
export async function loadSession() {
  const value = await SecureStore.getItemAsync(key);
  return value ? JSON.parse(value) : null;
}
export async function storeSession(session) {
  await SecureStore.setItemAsync(key, JSON.stringify({ accessToken: session.accessToken, expiresAt: session.expiresAt }));
}
export const clearSession = () => SecureStore.deleteItemAsync(key);
