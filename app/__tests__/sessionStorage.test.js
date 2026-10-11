import { loadSession, storeSession, loadProfileSessions, clearSession, removeProfileSession, expireProfileSession } from '../src/services/sessionStorage';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({ setItemAsync: jest.fn(async () => {}), getItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));

let values;
beforeEach(() => {
  values = new Map(); jest.clearAllMocks();
  SecureStore.getItemAsync.mockImplementation(async key => values.get(key) || null);
  SecureStore.setItemAsync.mockImplementation(async (key, value) => values.set(key, value));
  SecureStore.deleteItemAsync.mockImplementation(async key => values.delete(key));
});

test('persistencia nativa guarda access e refresh no SecureStore sem dados de usuario ou senha', async () => {
  const session = { accessToken: 'access', refreshToken: 'refresh', expiresAt: 12345 };
  await storeSession({ ...session, password: 'never-save', user: { name: 'Teste' } });
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('vikash.session', JSON.stringify(session));
  values.set('vikash.session', JSON.stringify(session));
  expect(await loadSession()).toEqual(session);
});

const a = { accessToken: 'a', refreshToken: 'refresh-a', expiresAt: 100,
  user: { uuid: 'a', name: 'Ana', email: 'ana@example.com' } };
const b = { ...a, accessToken: 'b', refreshToken: 'refresh-b', user: { uuid: 'b', name: 'Bruno', email: 'bruno@example.com' } };

test('salva cada perfil separadamente, apenas com os dados necessários e sem senha', async () => {
  await storeSession({ ...a, password: 'never-save', user: { ...a.user, role: 'USER', passwordHash: 'never-save' } });
  await storeSession(b);
  expect(await loadProfileSessions()).toEqual([a, b]); expect(await loadSession()).toEqual(b);
  expect(JSON.stringify([...values.values()])).not.toContain('never-save');
  expect(values.size).toBe(3); // Índice e dois registros independentes.
});

test('rotacionar perfil inativo não muda o ativo e logout não remove os outros', async () => {
  await storeSession(a); await storeSession(b);
  await storeSession({ ...a, refreshToken: 'rotated-a' }, { activate: false });
  expect(await loadSession()).toEqual(b);
  await removeProfileSession('b');
  expect(await loadSession()).toBeNull();
  expect(await loadProfileSessions()).toEqual([{ ...a, refreshToken: 'rotated-a' }]);
});

test('sessão expirada mantém identificação para reentrar, sem tokens, e não altera outro perfil', async () => {
  await storeSession(a); await storeSession(b);
  await expireProfileSession('a');
  expect(await loadSession()).toEqual(b);
  expect(await loadProfileSessions()).toEqual([{ user: a.user }, b]);
  await clearSession();
  expect(await loadSession()).toBeNull();
  expect(await loadProfileSessions()).toEqual([{ user: a.user }, { user: b.user }]);
});

test('migração remove a chave legada e gravar o mesmo UUID atualiza sem duplicar', async () => {
  values.set('vikash.session', JSON.stringify({ accessToken: 'legacy' }));
  await storeSession(a); await storeSession({ ...a, user: { ...a.user, email: 'new@example.com' } });
  expect(values.has('vikash.session')).toBe(false);
  expect(await loadProfileSessions()).toHaveLength(1);
  expect((await loadSession()).user.email).toBe('new@example.com');
});

test('gravações simultâneas preservam ambos os perfis', async () => {
  await Promise.all([storeSession(a), storeSession(b)]);
  expect(await loadProfileSessions()).toEqual([a, b]);
});
