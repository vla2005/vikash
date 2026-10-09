/* eslint-env browser */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Linking } from 'react-native';
import App from '../App';
import AppNavigator from '../src/navigation/AppNavigator';
import { OnboardingProvider } from '../src/contexts/OnboardingContext';
import ForgotPasswordScreen from '../src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../src/screens/ResetPasswordScreen';
import useRecoveryLinkWeb from '../src/hooks/useRecoveryLink.web';

jest.mock('../src/hooks/useAppFonts', () => () => true);
jest.mock('../src/components/Skeleton', () => ({ AppSkeleton: () => null }));
jest.mock('../src/navigation/AppNavigator', () => jest.fn(() => null));
jest.mock('../src/screens/ForgotPasswordScreen', () => jest.fn(() => null));
jest.mock('../src/screens/ResetPasswordScreen', () => jest.fn(() => null));
jest.mock('../src/contexts/OnboardingContext', () => ({ OnboardingProvider: jest.fn(({ children }) => children) }));
jest.mock('../src/contexts/ToastContext', () => ({ ToastProvider: ({ children }) => children }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaProvider: ({ children }) => children }));

let renderer;
const token = 'A'.repeat(43);
let listener;
let subscription;
beforeEach(() => {
  jest.clearAllMocks();
  subscription = { remove: jest.fn() };
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  jest.spyOn(Linking, 'addEventListener').mockImplementation((name, callback) => { listener = callback; return subscription; });
});
afterEach(async () => { await act(async () => renderer?.unmount()); renderer = undefined; jest.restoreAllMocks(); });

test('link de reset abre tela pública antes de restaurar uma sessão e permite solicitar novo link', async () => {
  Linking.getInitialURL.mockResolvedValue(`exp://192.168.1.8:8081/--/reset-password?token=${token}`);
  await act(async () => { renderer = TestRenderer.create(<App />); });
  expect(OnboardingProvider).not.toHaveBeenCalled();
  expect(renderer.root.findByType(ResetPasswordScreen).props.token).toBe(token);
  await act(async () => renderer.root.findByType(ResetPasswordScreen).props.onRequestLink());
  expect(renderer.root.findAllByType(ForgotPasswordScreen)).toHaveLength(1);
  expect(OnboardingProvider).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType(ForgotPasswordScreen).props.onBack());
  expect(renderer.root.findByType(AppNavigator).props.initialRouteName).toBe('Login');
});

test('aguarda a URL inicial antes de montar o fluxo autenticado', async () => {
  let finish;
  Linking.getInitialURL.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { renderer = TestRenderer.create(<App />); });
  expect(OnboardingProvider).not.toHaveBeenCalled();
  await act(async () => finish(`vikash://reset-password?token=${token}`));
  expect(renderer.root.findByType(ResetPasswordScreen).props.token).toBe(token);
  expect(OnboardingProvider).not.toHaveBeenCalled();
});

test('link recebido com app aberto troca para recuperação e termina no login', async () => {
  await act(async () => { renderer = TestRenderer.create(<App />); });
  expect(renderer.root.findByType(AppNavigator).props.initialRouteName).toBe('Home');
  await act(async () => listener({ url: `vikash://reset-password?token=${token}` }));
  expect(renderer.root.findByType(ResetPasswordScreen).props.token).toBe(token);
  await act(async () => renderer.root.findByType(ResetPasswordScreen).props.onBack());
  expect(renderer.root.findByType(AppNavigator).props.initialRouteName).toBe('Login');
  await act(async () => renderer.unmount()); renderer = undefined;
  expect(subscription.remove).toHaveBeenCalledTimes(1);
});

test('web lê token uma vez, remove URL sensível e navega entre recuperação e login', async () => {
  const originalWindow = global.window;
  const listeners = {};
  global.window = {
    location: { href: `http://localhost:5173/reset-password?token=${token}` },
    history: { replaceState: jest.fn() },
    addEventListener: jest.fn((name, callback) => { listeners[name] = callback; }),
    removeEventListener: jest.fn(),
  };
  let route;
  function Observer() { route = useRecoveryLinkWeb(); return null; }
  try {
    await act(async () => { renderer = TestRenderer.create(<Observer />); });
    expect(route.route).toEqual({ kind: 'reset', token });
    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/reset-password');
    await act(async () => route.openForgot());
    expect(route.route).toEqual({ kind: 'forgot' });
    await act(async () => route.exit());
    expect(route.route).toEqual({ kind: 'login' });
    expect(window.history.replaceState).toHaveBeenLastCalledWith(null, '', '/login');
    window.location.href = `http://localhost:5173/reset-password?token=${'B'.repeat(43)}`;
    await act(async () => listeners.popstate());
    expect(route.route).toEqual({ kind: 'reset', token: 'B'.repeat(43) });
    await act(async () => renderer.unmount()); renderer = undefined;
    expect(window.removeEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
  } finally { global.window = originalWindow; }
});
