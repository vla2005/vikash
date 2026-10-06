import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { OnboardingProvider, useOnboarding } from '../src/contexts/OnboardingContext';
import { loadSession, storeSession, clearSession } from '../src/services/sessionStorage';
import { postJson } from '../src/services/apiClient';
import { fetchCategories } from '../src/services/categories';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/services/sessionStorage', () => ({ loadSession: jest.fn(), storeSession: jest.fn(async () => {}), clearSession: jest.fn(async () => {}) }));
const user = { name: 'Teste', email: 'teste@example.com' };
const saved = { accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt: Date.now() + 600000 };
const rotated = { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 900, user };
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const originalFetch = global.fetch;
let state;
let renderer;
function Observer() { state = useOnboarding(); return null; }
async function render() { await act(async () => { renderer = TestRenderer.create(<OnboardingProvider><Observer /></OnboardingProvider>); }); }
beforeEach(() => {
  jest.clearAllMocks();
  loadSession.mockResolvedValue(saved);
  global.fetch = jest.fn(async url => url.endsWith('/refresh') ? response(rotated) : response(user));
});
afterEach(async () => { if (renderer) { await act(() => renderer.unmount()); } global.fetch = originalFetch; });

test('ao reabrir com access expirado renova, salva os dois tokens e valida o usuario', async () => {
  loadSession.mockResolvedValue({ ...saved, expiresAt: Date.now() - 1000 });
  await render();
  expect(state.session).toMatchObject(rotated);
  expect(state.ready).toBe(true);
  expect(storeSession).toHaveBeenCalledWith(expect.objectContaining(rotated));
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/auth/refresh', expect.objectContaining({ body: JSON.stringify({ refreshToken: 'old-refresh' }) }));
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/auth/me', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer new-access' }) }));
});

test('logout renova antes de revogar, envia o refresh atual e limpa a sessão salva', async () => {
  await render();
  global.fetch.mockClear();
  loadSession.mockClear();
  global.fetch.mockImplementation(async (url, options) => {
    if (url.endsWith('/refresh')) return response(rotated);
    if (url.endsWith('/logout')) return response(null, options.headers.Authorization === 'Bearer old-access' ? 401 : 204);
    return response(user);
  });
  await act(async () => state.logout());
  const logoutCalls = global.fetch.mock.calls.filter(([url]) => url.endsWith('/logout'));
  expect(logoutCalls).toHaveLength(2);
  expect(logoutCalls[1][1]).toMatchObject({ body: JSON.stringify({ refreshToken: 'new-refresh' }), headers: { Authorization: 'Bearer new-access' } });
  expect(clearSession).toHaveBeenCalledTimes(1);
  expect(state.session).toBeNull();
  expect(state.profile).toEqual({ name: '' });
});

test('falha de rede ao sair preserva a sessão para tentar novamente', async () => {
  await render();
  global.fetch.mockRejectedValue(new TypeError('Network error'));
  await act(async () => { await expect(state.logout()).rejects.toThrow('Não foi possível conectar'); });
  expect(state.session.refreshToken).toBe('old-refresh');
  expect(clearSession).not.toHaveBeenCalled();
});

test('401 repete o POST uma vez com token novo e atualiza ambos os headers', async () => {
  await render();
  global.fetch.mockClear();
  global.fetch.mockImplementation(async (url, options) => {
    if (url.endsWith('/refresh')) { return response(rotated); }
    return response({ name: 'Pets' }, options.headers.Authorization === 'Bearer old-access' ? 401 : 200);
  });
  await act(async () => { await postJson('/api/category/create', { name: 'Pets' }, saved.accessToken, { headers: { access_token: saved.accessToken } }); });
  const calls = global.fetch.mock.calls.filter(([url]) => url.endsWith('/create'));
  expect(calls).toHaveLength(2);
  expect(calls[1][1]).toMatchObject({ body: JSON.stringify({ name: 'Pets' }), headers: { Authorization: 'Bearer new-access', access_token: 'new-access' } });
});

test('requisições simultaneas compartilham uma renovacao e nao reutilizam refresh rotacionado', async () => {
  await render();
  let finish;
  global.fetch.mockClear();
  global.fetch.mockImplementation((url, options) => {
    if (url.endsWith('/refresh')) { return new Promise(resolve => { finish = resolve; }); }
    return Promise.resolve(response({}, options.headers.Authorization === 'Bearer old-access' ? 401 : 200));
  });
  let pending;
  await act(async () => { pending = Promise.all([postJson('/a', {}, saved.accessToken), postJson('/b', {}, saved.accessToken)]); });
  expect(global.fetch.mock.calls.filter(([url]) => url.endsWith('/refresh'))).toHaveLength(1);
  await act(async () => { finish(response(rotated)); await pending; });
  expect(state.session.refreshToken).toBe('new-refresh');
});

test('GET de categorias tambem renova e repete a consulta', async () => {
  await render();
  const categories = { defaultCategories: [], customCategories: [] };
  global.fetch.mockImplementation(async (url, options) => url.endsWith('/refresh') ? response(rotated) : response(categories, options.headers.Authorization === 'Bearer old-access' ? 401 : 200));
  await act(async () => { expect(await fetchCategories(saved.accessToken)).toEqual(categories); });
  expect(state.session.accessToken).toBe('new-access');
});

test.each([401, 403])('refresh rejeitado (%i) encerra a sessao', async status => {
  loadSession.mockResolvedValue({ ...saved, expiresAt: Date.now() - 1 });
  global.fetch.mockResolvedValue(response({}, status));
  await render();
  expect(state.session).toBeNull();
  expect(clearSession).toHaveBeenCalled();
  expect(state.restoreError).toBe('');
});

test('falha de rede no refresh preserva armazenamento e permite tentar novamente', async () => {
  loadSession.mockResolvedValue({ ...saved, expiresAt: Date.now() - 1 });
  global.fetch.mockRejectedValue(new TypeError('Offline'));
  await render();
  expect(clearSession).not.toHaveBeenCalled();
  expect(state.restoreError).not.toBe('');
  global.fetch.mockImplementation(async url => url.endsWith('/refresh') ? response(rotated) : response(user));
  await act(async () => state.retryRestore());
  expect(state.restoreError).toBe('');
  expect(state.session.refreshToken).toBe('new-refresh');
});

test('segundo 401 apos renovacao encerra sessao sem loop', async () => {
  await render();
  global.fetch.mockClear();
  global.fetch.mockImplementation(async url => url.endsWith('/refresh') ? response(rotated) : response({}, 401));
  await act(async () => { await expect(postJson('/a', {}, saved.accessToken)).rejects.toMatchObject({ status: 401 }); });
  expect(global.fetch).toHaveBeenCalledTimes(3);
  expect(state.session).toBeNull();
});

test('logout durante renovacao nao restaura sessao antiga', async () => {
  await render();
  let finish;
  global.fetch.mockImplementation(url => url.endsWith('/refresh') ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(response({}, 401)));
  let pending;
  await act(async () => { pending = postJson('/a', {}, saved.accessToken).catch(cause => cause); });
  await act(() => state.reset());
  await act(async () => { finish(response(rotated)); await pending; });
  expect(state.session).toBeNull();
  expect(storeSession).not.toHaveBeenCalled();
});

test('primeira operacao apos expirar renova sem consultar me e conserva o novo refresh', async () => {
  await render();
  const now = jest.spyOn(Date, 'now').mockReturnValue(saved.expiresAt + 1);
  try {
    global.fetch.mockClear();
    await act(async () => { await postJson('/api/transaction/create', { transcription: 'Almoço' }, saved.accessToken); });
    expect(global.fetch.mock.calls[0][0]).toBe('http://api.test/api/auth/refresh');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toBe('http://api.test/api/transaction/create');
    expect(state.session.refreshToken).toBe('new-refresh');
    expect(clearSession).not.toHaveBeenCalled();
  } finally { now.mockRestore(); }
});

test('erro 500 na renovacao preserva os tokens para nova tentativa', async () => {
  loadSession.mockResolvedValue({ ...saved, expiresAt: Date.now() - 1 });
  global.fetch.mockResolvedValue(response({}, 500));
  await render();
  expect(clearSession).not.toHaveBeenCalled();
  expect(state.restoreError).not.toBe('');
});
