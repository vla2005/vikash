import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { OnboardingProvider, useOnboarding } from '../src/contexts/OnboardingContext';
import AppNavigator from '../src/navigation/AppNavigator.web';
import HomeScreen from '../src/screens/HomeScreen';
import ProtectedScreen from '../src/navigation/ProtectedScreen';
import ConfirmationDialog from '../src/components/ConfirmationDialog';
jest.mock('../src/hooks/useToast', () => ({ __esModule: true, default: () => ({ showToast: jest.fn() }) }));
import { loadSession, clearSession } from '../src/services/sessionStorage';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/services/dashboard', () => ({ fetchDashboard: jest.fn(async () => ({ totalBalance: 0, incomes: 0, expenses: 0 })) }));
jest.mock('../src/services/sessionStorage', () => ({ loadSession: jest.fn(), storeSession: jest.fn(async () => {}), clearSession: jest.fn(async () => {}) }));
jest.mock('../src/screens/LoginScreen', () => { const ReactModule = require('react'); const { Text: Label } = require('react-native'); return () => ReactModule.createElement(Label, null, 'LOGIN'); });
jest.mock('../src/screens/RegisterScreen', () => () => null);
jest.mock('../src/screens/CreateAccountScreen', () => () => null);
jest.mock('../src/screens/AccountsSummaryScreen', () => () => null);
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Svg: Shape, G: Shape, Path: Shape, Rect: Shape, Circle: Shape, Line: Shape, Polyline: Shape };
});

let renderer;
let state;
const originalFetch = global.fetch;
const user = { name: 'Viktor', email: 'viktor@example.com' };
function Observer() { state = useOnboarding(); return null; }
beforeEach(() => {
  jest.clearAllMocks();
  loadSession.mockResolvedValue(null);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => user });
});
afterEach(async () => { if (renderer) { await act(() => renderer.unmount()); } global.fetch = originalFetch; });
async function render(children = <AppNavigator />) {
  await act(async () => { renderer = TestRenderer.create(<OnboardingProvider><Observer />{children}</OnboardingProvider>); });
}
function labels() { return renderer.root.findAllByType(Text).map(node => node.props.children); }

test('sem sessao, tenta HOME mas mostra somente LOGIN', async () => {
  await render();
  expect(labels()).toEqual(['LOGIN']);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('perfil usa os dados da sessão e logout confirmado revoga token e retorna ao login', async () => {
  loadSession.mockResolvedValue({ accessToken: 'saved-token', refreshToken: 'saved-refresh', expiresAt: Date.now() + 600000 });
  global.fetch.mockImplementation(async url => url.endsWith('/logout')
    ? { ok: true, status: 204, json: async () => { throw new Error('No body'); } }
    : { ok: true, status: 200, json: async () => user });
  await render();
  const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && node.props.onPress)[0];
  await act(async () => button('Abrir meu perfil').props.onPress());
  expect(labels()).toContain(user.email);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  await act(async () => button('Sair da conta').props.onPress());
  const dialog = () => renderer.root.findAllByType(ConfirmationDialog).find(node => node.props.title === 'Sair da conta?');
  expect(dialog().props.visible).toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  await act(async () => dialog().props.onCancel());
  expect(dialog().props.visible).toBe(false);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  await act(async () => button('Sair da conta').props.onPress());
  await act(async () => dialog().props.onConfirm());
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/auth/logout', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ refreshToken: 'saved-refresh' }),
    headers: expect.objectContaining({ Authorization: 'Bearer saved-token' }),
  }));
  expect(clearSession).toHaveBeenCalledTimes(1);
  expect(state.session).toBeNull();
  expect(labels()).toEqual(['LOGIN']);
});

test('sessao salva so abre HOME depois da validacao na API', async () => {
  loadSession.mockResolvedValue({ accessToken: 'saved-token', expiresAt: Date.now() + 60000 });
  let finish;
  global.fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await render();
  expect(labels()).toEqual([]);
  await act(async () => { finish({ ok: true, json: async () => user }); });
  expect(labels()).toContain('Saldo total');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/auth/me', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer saved-token' }) }));
});

test('sessao expirada e removida e redireciona ao login', async () => {
  loadSession.mockResolvedValue({ accessToken: 'expired', expiresAt: Date.now() - 1 });
  await render();
  expect(labels()).toEqual(['LOGIN']);
  expect(clearSession).toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('token rejeitado pela API nao libera HOME', async () => {
  loadSession.mockResolvedValue({ accessToken: 'invalid', expiresAt: Date.now() + 60000 });
  global.fetch.mockResolvedValue({ ok: false, status: 401 });
  await render();
  expect(labels()).toEqual(['LOGIN']);
  expect(state.session).toBeNull();
  expect(clearSession).toHaveBeenCalled();
});

test('indisponibilidade da API preserva a sessao e oferece tentar novamente sem liberar HOME', async () => {
  loadSession.mockResolvedValue({ accessToken: 'saved', expiresAt: Date.now() + 60000 });
  global.fetch.mockRejectedValue(new TypeError('Network error'));
  await render();
  expect(labels()).toContain('Tentar novamente');
  expect(labels()).not.toContain('Saldo total');
  expect(clearSession).not.toHaveBeenCalled();
});

test('guarda bloqueia acesso direto e remove HOME quando sessao e encerrada', async () => {
  loadSession.mockResolvedValue({ accessToken: 'saved', expiresAt: Date.now() + 60000 });
  const navigation = { reset: jest.fn() };
  await render(<ProtectedScreen component={HomeScreen} navigation={navigation} />);
  expect(labels()).toContain('Saldo total');
  await act(() => state.reset());
  expect(labels()).toEqual([]);
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
});

test('telas protegidas nao repetem me com o tempo ou ao recuperar o foco', async () => {
  jest.useFakeTimers();
  try {
    loadSession.mockResolvedValue({ accessToken: 'saved', expiresAt: Date.now() + 600000 });
    const navigation = { reset: jest.fn() };
    const content = active => <OnboardingProvider><Observer /><ProtectedScreen component={HomeScreen} navigation={navigation} active={active} /></OnboardingProvider>;
    await act(async () => { renderer = TestRenderer.create(content(true)); });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTime(180000));
    await act(async () => renderer.update(content(false)));
    await act(async () => renderer.update(content(true)));
    expect(labels()).toContain('Saldo total');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(navigation.reset).not.toHaveBeenCalled();
  } finally { jest.useRealTimers(); }
});
