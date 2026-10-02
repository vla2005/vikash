import { loadSession, storeSession } from '../src/services/sessionStorage';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({ setItemAsync: jest.fn(async () => {}), getItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));

test('persistencia nativa guarda access e refresh no SecureStore sem dados de usuario ou senha', async () => {
  const session = { accessToken: 'access', refreshToken: 'refresh', expiresAt: 12345 };
  await storeSession({ ...session, password: 'never-save', user: { name: 'Teste' } });
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('vikash.session', JSON.stringify(session));
  SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(session));
  expect(await loadSession()).toEqual(session);
});
