import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { OnboardingProvider, useOnboarding } from '../src/contexts/OnboardingContext';
import ProtectedScreen from '../src/navigation/ProtectedScreen';
import { loadSession, loadProfileSessions, storeSession, clearSession, expireProfileSession, removeProfileSession } from '../src/services/sessionStorage';
import { postJson } from '../src/services/apiClient';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/services/sessionStorage', () => ({
  loadSession: jest.fn(), loadProfileSessions: jest.fn(), storeSession: jest.fn(),
  clearSession: jest.fn(), expireProfileSession: jest.fn(), removeProfileSession: jest.fn(),
}));
const a = { accessToken: 'access-a', refreshToken: 'refresh-a', expiresAt: Date.now() + 600000,
  user: { uuid: 'user-a', name: 'Ana', email: 'ana@example.com' } };
const b = { accessToken: 'access-b', refreshToken: 'refresh-b', expiresAt: Date.now() + 600000,
  user: { uuid: 'user-b', name: 'Bruno', email: 'bruno@example.com' } };
const reply = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const originalFetch = global.fetch;
let renderer;
let state;
function Observer() { state = useOnboarding(); return null; }
async function render(children) {
  await act(async () => { renderer = TestRenderer.create(<OnboardingProvider><Observer />{children}</OnboardingProvider>); });
}
beforeEach(() => {
  jest.resetAllMocks();
  loadSession.mockResolvedValue(a); loadProfileSessions.mockResolvedValue([a, b]);
  storeSession.mockResolvedValue(); clearSession.mockResolvedValue(); expireProfileSession.mockResolvedValue(); removeProfileSession.mockResolvedValue();
  global.fetch = jest.fn(async (url, options) => {
    if (url.endsWith('/logout')) { return reply(null, 204); }
    return reply(options.headers.Authorization === 'Bearer access-b' ? b.user : a.user);
  });
});
afterEach(async () => { await act(() => renderer?.unmount()); global.fetch = originalFetch; });

test('restaura só o perfil ativo e expõe a lista sem tokens', async () => {
  await render();
  expect(state.activeProfileId).toBe('user-a');
  expect(state.profiles).toEqual([
    { id: 'user-a', name: 'Ana', email: 'ana@example.com', requiresLogin: false },
    { id: 'user-b', name: 'Bruno', email: 'bruno@example.com', requiresLogin: false },
  ]);
  expect(JSON.stringify(state.profiles)).not.toContain('access-');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('alterna sem login, reinicia as telas e não reaproveita formulários nem contas', async () => {
  const mounts = jest.fn();
  function Screen() { React.useEffect(() => { mounts(); }, []); return null; }
  await render(<ProtectedScreen component={Screen} navigation={{ reset: jest.fn() }} />);
  const initialEpoch = state.sessionEpoch;
  await act(() => state.completeSetup());
  global.fetch.mockClear();
  await act(async () => state.switchProfile('user-b'));
  expect(state.profile).toEqual(b.user);
  expect(state.accounts).toEqual([]); expect(state.completed).toBe(false);
  expect(state.sessionEpoch).toBe(initialEpoch + 1); expect(mounts).toHaveBeenCalledTimes(2);
  expect(storeSession).toHaveBeenLastCalledWith(b);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/auth/me', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-b' }) }));
  await act(async () => state.switchProfile('user-a'));
  expect(state.session.accessToken).toBe('access-a');
});

test('renova a conta escolhida e persiste a rotação antes de ativá-la', async () => {
  loadProfileSessions.mockResolvedValue([a, { ...b, expiresAt: Date.now() - 1 }]);
  await render();
  global.fetch.mockClear();
  const rotated = { ...b, accessToken: 'rotated-b', refreshToken: 'rotated-refresh-b', expiresIn: 900 };
  global.fetch.mockImplementation(async url => url.endsWith('/refresh') ? reply(rotated) : reply(b.user));
  await act(async () => state.switchProfile('user-b'));
  expect(global.fetch.mock.calls[0][1].body).toBe(JSON.stringify({ refreshToken: 'refresh-b' }));
  expect(storeSession.mock.calls[0]).toEqual([expect.objectContaining({ refreshToken: 'rotated-refresh-b' }), { activate: false }]);
  expect(state.session.refreshToken).toBe('rotated-refresh-b');
});

test('login de outra conta conserva a anterior e não duplica o mesmo UUID', async () => {
  await render();
  global.fetch.mockImplementation(async url => url.endsWith('/login') ? reply({ ...b, expiresIn: 900 }) : reply(b.user));
  await act(async () => state.login({ email: b.user.email, password: 'Senha123!' }));
  expect(state.activeProfileId).toBe('user-b'); expect(state.profiles).toHaveLength(2);
  expect(clearSession).not.toHaveBeenCalled();
  expect(JSON.stringify(storeSession.mock.calls)).not.toContain('Senha123!');
  await act(async () => state.login({ email: b.user.email, password: 'Senha123!' }));
  expect(state.profiles).toHaveLength(2);
});

test.each([401, 403])('sessão escolhida inválida (%i) só pede login daquele perfil', async status => {
  await render();
  global.fetch.mockResolvedValue(reply({}, status));
  await act(async () => { await expect(state.switchProfile('user-b')).rejects.toMatchObject({ status }); });
  expect(state.activeProfileId).toBe('user-a');
  expect(state.profiles.find(item => item.id === 'user-b').requiresLogin).toBe(true);
  expect(expireProfileSession).toHaveBeenCalledWith('user-b');
  expect(clearSession).not.toHaveBeenCalled();
});

test('falha de rede na troca conserva o perfil atual e ambas as sessões', async () => {
  await render(); global.fetch.mockRejectedValue(new TypeError('Offline'));
  await act(async () => { await expect(state.switchProfile('user-b')).rejects.toThrow('Offline'); });
  expect(state.activeProfileId).toBe('user-a');
  expect(state.profiles.every(item => !item.requiresLogin)).toBe(true);
  expect(expireProfileSession).not.toHaveBeenCalled(); expect(storeSession).not.toHaveBeenCalled();
});

test('uma rotação já concluída não se perde se me falhar depois', async () => {
  loadProfileSessions.mockResolvedValue([a, { ...b, expiresAt: Date.now() - 1 }]);
  await render();
  global.fetch.mockImplementation(async url => {
    if (url.endsWith('/refresh')) { return reply({ ...b, accessToken: 'rotated-b', refreshToken: 'rotated-refresh-b', expiresIn: 900 }); }
    throw new TypeError('Offline');
  });
  await act(async () => { await expect(state.switchProfile('user-b')).rejects.toThrow('Offline'); });
  expect(state.activeProfileId).toBe('user-a');
  expect(storeSession).toHaveBeenLastCalledWith(expect.objectContaining({ refreshToken: 'rotated-refresh-b' }), { activate: false });
  global.fetch.mockImplementation(async (url, options) => {
    expect(options.headers.Authorization).toBe('Bearer rotated-b'); return reply(b.user);
  });
  await act(async () => state.switchProfile('user-b'));
  expect(state.session.refreshToken).toBe('rotated-refresh-b');
});

test('sair da conta inativa revoga só ela e mantém a conta atual aberta', async () => {
  await render();
  await act(async () => state.logout('user-b'));
  expect(state.session).toEqual(a); expect(state.profiles.map(item => item.id)).toEqual(['user-a']);
  expect(removeProfileSession).toHaveBeenCalledWith('user-b'); expect(clearSession).not.toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/auth/logout', expect.objectContaining({ body: JSON.stringify({ refreshToken: 'refresh-b' }), headers: expect.objectContaining({ Authorization: 'Bearer access-b' }) }));
});

test('sair da conta ativa conserva as outras para escolher no login', async () => {
  await render(); await act(async () => state.logout());
  expect(state.session).toBeNull(); expect(state.profiles.map(item => item.id)).toEqual(['user-b']);
  expect(removeProfileSession).toHaveBeenCalledWith('user-a');
  await act(async () => state.switchProfile('user-b'));
  expect(state.profile).toEqual(b.user);
});

test.each([401, 403])('sair remove a conta ativa mesmo com refresh inválido (%i), preservando a outra', async status => {
  await render();
  global.fetch.mockImplementation(async url => reply({}, url.endsWith('/logout') ? 401 : status));
  await act(async () => state.logout());
  expect(state.session).toBeNull();
  expect(state.profiles.map(item => item.id)).toEqual(['user-b']);
  expect(removeProfileSession).toHaveBeenCalledWith('user-a');
  expect(removeProfileSession).not.toHaveBeenCalledWith('user-b');
});

test('sair preserva a conta ativa se a revogação falhar por falta de rede', async () => {
  await render();
  global.fetch.mockRejectedValue(new TypeError('Offline'));
  await act(async () => { await expect(state.logout()).rejects.toThrow('Não foi possível conectar à API'); });
  expect(state.activeProfileId).toBe('user-a');
  expect(state.profiles).toHaveLength(2);
  expect(removeProfileSession).not.toHaveBeenCalled();
});

test('resposta antiga é descartada e nunca repete uma compra com o token de outra conta', async () => {
  await render();
  let finish;
  let originalSignal;
  global.fetch.mockImplementation(async (url, options) => {
    if (url.endsWith('/purchase')) {
      originalSignal = options.signal;
      return new Promise(resolve => { finish = resolve; });
    }
    return reply(b.user);
  });
  let pending;
  await act(async () => { pending = postJson('/purchase', { amount: 10 }, 'access-a').catch(cause => cause); });
  await act(async () => state.switchProfile('user-b'));
  expect(originalSignal.aborted).toBe(true);
  await act(async () => { finish(reply({}, 401)); expect(await pending).toMatchObject({ status: 401 }); });
  expect(state.activeProfileId).toBe('user-b');
  expect(global.fetch.mock.calls.filter(([url]) => url.endsWith('/purchase'))).toHaveLength(1);
  global.fetch.mockClear();
  await act(async () => { await expect(postJson('/purchase', {}, 'access-a')).rejects.toMatchObject({ status: 401 }); });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('troca bloqueia ações duplicadas enquanto valida a sessão', async () => {
  await render(); let finish;
  global.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  let pending;
  await act(async () => { pending = state.switchProfile('user-b'); });
  await act(async () => { await expect(state.switchProfile('user-b')).rejects.toThrow('Aguarde'); });
  await act(async () => { finish(reply(b.user)); await pending; });
  expect(state.activeProfileId).toBe('user-b');
});
