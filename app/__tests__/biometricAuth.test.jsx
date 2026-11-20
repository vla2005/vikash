import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { OnboardingProvider, useOnboarding } from '../src/contexts/OnboardingContext';
import * as storage from '../src/services/sessionStorage';
import { loginUser, fetchCurrentUser, refreshSession } from '../src/services/auth';
import { configureAuth } from '../src/services/apiClient';
import { biometricCapability } from '../src/services/biometricSession';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/services/apiClient', () => ({ ...jest.requireActual('../src/services/apiClient'), configureAuth: jest.fn(() => () => {}) }));
jest.mock('../src/services/auth', () => ({ loginUser: jest.fn(), fetchCurrentUser: jest.fn(), refreshSession: jest.fn() }));
jest.mock('../src/services/biometricSession', () => ({ biometricCapability: jest.fn(), lockBiometricSessions: jest.fn() }));
jest.mock('../src/services/sessionStorage', () => ({
  loadSession: jest.fn(), loadProfileSessions: jest.fn(), storeSession: jest.fn(), clearSession: jest.fn(),
  expireProfileSession: jest.fn(), removeProfileSession: jest.fn(), unlockProfileSession: jest.fn(),
  enableProfileBiometrics: jest.fn(), disableProfileBiometrics: jest.fn(), biometricPromptSeen: jest.fn(), markBiometricPromptSeen: jest.fn(),
}));
const user = { uuid: 'ana-id', name: 'Ana', email: 'ana@example.test' };
const unlocked = { user, accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 600000, biometricEnabled: true };
const locked = { user, biometricEnabled: true, biometricLocked: true };
let renderer, state;
function Observer() { state = useOnboarding(); return null; }
beforeEach(() => {
  jest.clearAllMocks();
  for (const method of ['storeSession', 'clearSession', 'expireProfileSession', 'enableProfileBiometrics', 'disableProfileBiometrics', 'markBiometricPromptSeen']) storage[method].mockResolvedValue();
  storage.loadSession.mockResolvedValue(locked); storage.loadProfileSessions.mockResolvedValue([locked]);
  storage.unlockProfileSession.mockResolvedValue({ ...unlocked }); storage.biometricPromptSeen.mockResolvedValue(false);
  fetchCurrentUser.mockResolvedValue(user); loginUser.mockResolvedValue({ ...unlocked });
  biometricCapability.mockResolvedValue({ available: true });
});
afterEach(async () => { if (renderer) await act(() => renderer.unmount()); });
async function render() { await act(async () => { renderer = TestRenderer.create(<OnboardingProvider><Observer /></OnboardingProvider>); }); }

test('início bloqueado não chama API nem abre biometria automaticamente', async () => {
  await render();
  expect(state.ready).toBe(true); expect(state.session).toBeNull(); expect(state.biometricOffer).toBe(false);
  expect(state.preferredBiometricProfileId).toBe(user.uuid);
  expect(fetchCurrentUser).not.toHaveBeenCalled(); expect(storage.unlockProfileSession).not.toHaveBeenCalled();
});
test('botão biométrico só libera sessão depois da confirmação do servidor', async () => {
  await render();
  let confirm;
  fetchCurrentUser.mockImplementation(() => new Promise(resolve => { confirm = resolve; }));
  let pending;
  await act(async () => { pending = state.loginWithBiometrics(user.uuid); });
  expect(storage.unlockProfileSession).toHaveBeenCalledWith(user.uuid);
  expect(state.session).toBeNull();
  await act(async () => { confirm(user); await pending; });
  expect(state.session.user.uuid).toBe(user.uuid); expect(state.session.biometricEnabled).toBe(true);
});
test('cancelamento nativo preserva conta bloqueada e não chama a API', async () => {
  await render();
  storage.unlockProfileSession.mockRejectedValue(Object.assign(new Error('Cancelado'), { canceled: true }));
  await act(async () => { await expect(state.loginWithBiometrics(user.uuid)).rejects.toMatchObject({ canceled: true }); });
  expect(state.session).toBeNull(); expect(fetchCurrentUser).not.toHaveBeenCalled();
  expect(storage.expireProfileSession).not.toHaveBeenCalled();
});
test('rede indisponível não abre HOME e preserva a credencial protegida', async () => {
  await render(); fetchCurrentUser.mockRejectedValue(new Error('Sem rede'));
  await act(async () => { await expect(state.loginWithBiometrics(user.uuid)).rejects.toThrow('Sem rede'); });
  expect(state.session).toBeNull(); expect(storage.expireProfileSession).not.toHaveBeenCalled();
});
test('sessão rejeitada no servidor exige senha e remove a credencial biométrica inválida', async () => {
  await render(); fetchCurrentUser.mockRejectedValue(Object.assign(new Error('Revogada'), { status: 403 }));
  await act(async () => { await expect(state.loginWithBiometrics(user.uuid)).rejects.toThrow('Revogada'); });
  expect(state.session).toBeNull(); expect(storage.expireProfileSession).toHaveBeenCalledWith(user.uuid);
  expect(state.profiles[0].biometricEnabled).toBeUndefined();
});
test('troca de época durante prompt descarta o resultado e não consulta a API', async () => {
  await render(); let unlock;
  storage.unlockProfileSession.mockImplementation(() => new Promise(resolve => { unlock = resolve; }));
  let pending;
  await act(async () => { pending = state.loginWithBiometrics(user.uuid); });
  await act(async () => { state.reset(); });
  await act(async () => { unlock(unlocked); await expect(pending).rejects.toThrow('sessão mudou'); });
  expect(state.session).toBeNull(); expect(fetchCurrentUser).not.toHaveBeenCalled();
});
test('primeiro login oferece ativação e o toggle mantém a conta correta', async () => {
  storage.loadSession.mockResolvedValue(null); storage.loadProfileSessions.mockResolvedValue([]);
  await render();
  await act(async () => { await state.login({ email: user.email, password: 'never-store' }); });
  expect(state.biometricOffer).toBe(true);
  expect(storage.storeSession).toHaveBeenCalledWith(expect.not.objectContaining({ password: expect.anything() }), { passwordLogin: true });
  await act(async () => { await state.setBiometricEnabled(true); });
  expect(storage.enableProfileBiometrics).toHaveBeenCalledWith(user.uuid);
  expect(state.session.biometricEnabled).toBe(true); expect(state.biometricOffer).toBe(false);
  await act(async () => { await state.setBiometricEnabled(false); });
  expect(storage.disableProfileBiometrics).toHaveBeenCalledWith(user.uuid);
  expect(state.session.biometricEnabled).toBe(false);
});
test('recusar convite não habilita biometria e não insiste após um novo login', async () => {
  storage.loadSession.mockResolvedValue(null); storage.loadProfileSessions.mockResolvedValue([]);
  await render();
  await act(async () => { await state.login({ email: user.email, password: 'password' }); });
  await act(async () => { await state.dismissBiometricOffer(); });
  expect(storage.markBiometricPromptSeen).toHaveBeenCalledWith(user.uuid);
  expect(storage.enableProfileBiometrics).not.toHaveBeenCalled();
  storage.biometricPromptSeen.mockResolvedValue(true);
  await act(async () => { await state.login({ email: user.email, password: 'password' }); });
  expect(state.biometricOffer).toBe(false);
});

test('credencial de outra conta nunca é aceita no botão escolhido', async () => {
  await render();
  storage.unlockProfileSession.mockResolvedValue({ ...unlocked, user: { ...user, uuid: 'other-user' } });
  await act(async () => { await expect(state.loginWithBiometrics(user.uuid)).rejects.toThrow('validar esta conta'); });
  expect(state.session).toBeNull(); expect(fetchCurrentUser).not.toHaveBeenCalled();
});
test('renovação atrasada não regrava tokens depois de encerrar a sessão', async () => {
  await render();
  storage.unlockProfileSession.mockResolvedValue({ ...unlocked, expiresAt: 0 });
  let rotate;
  refreshSession.mockImplementation(() => new Promise(resolve => { rotate = resolve; }));
  let pending;
  await act(async () => { pending = state.loginWithBiometrics(user.uuid); });
  await act(async () => { state.reset(); });
  await act(async () => { rotate({ ...unlocked, refreshToken: 'late-token' }); await expect(pending).rejects.toThrow('sessão mudou'); });
  expect(storage.storeSession).not.toHaveBeenCalled(); expect(state.session).toBeNull();
});

test('desativar aguarda uma renovação em voo e não publica proteção ligada com storage normal', async () => {
  storage.loadSession.mockResolvedValue({ ...unlocked });
  await render(); let rotate;
  refreshSession.mockImplementation(() => new Promise(resolve => { rotate = resolve; }));
  const resolveToken = configureAuth.mock.calls.at(-1)[0];
  let renewing, disabling;
  await act(async () => { renewing = resolveToken('access', true); });
  await act(async () => { disabling = state.setBiometricEnabled(false); });
  expect(storage.disableProfileBiometrics).not.toHaveBeenCalled();
  await act(async () => { rotate({ ...unlocked, accessToken: 'rotated-access' }); await Promise.all([renewing, disabling]); });
  expect(state.session.biometricEnabled).toBe(false);
  expect(state.session.accessToken).toBe('rotated-access');
});
test('renovação iniciada durante ativação aguarda a proteção antes de persistir novos tokens', async () => {
  storage.loadSession.mockResolvedValue({ ...unlocked, biometricEnabled: false });
  await render(); let enable;
  storage.enableProfileBiometrics.mockImplementation(() => new Promise(resolve => { enable = resolve; }));
  refreshSession.mockResolvedValue({ ...unlocked, accessToken: 'rotated-access' });
  const resolveToken = configureAuth.mock.calls.at(-1)[0];
  let enabling, renewing;
  await act(async () => { enabling = state.setBiometricEnabled(true); });
  await act(async () => { renewing = resolveToken('access', true); });
  expect(refreshSession).not.toHaveBeenCalled();
  await act(async () => { enable(); await Promise.all([enabling, renewing]); });
  expect(state.session.biometricEnabled).toBe(true);
  expect(storage.storeSession).toHaveBeenLastCalledWith(expect.objectContaining({ biometricEnabled: true }));
});
test('conta com chave biométrica invalidada pode ser removida sem ficar presa no seletor', async () => {
  await render();
  storage.unlockProfileSession.mockRejectedValue(Object.assign(new Error('Chave invalidada'), { invalidated: true }));
  await act(async () => { await state.logout(user.uuid); });
  expect(storage.removeProfileSession).toHaveBeenCalledWith(user.uuid);
  expect(state.profiles).toEqual([]);
});
