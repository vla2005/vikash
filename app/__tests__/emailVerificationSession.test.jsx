import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import App from '../App';
import { authenticatedFetch } from '../src/services/apiClient';
import { loadSession, storeSession, loadProfileSessions, clearSession } from '../src/services/sessionStorage';

let mockRoute = null, mockState;
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/hooks/useRecoveryLink', () => () => ({ ready: true, route: mockRoute, exit: () => {} }));
jest.mock('../src/hooks/useAppFonts', () => () => true);
jest.mock('../src/components/AnimatedSplash', () => () => null);
jest.mock('../src/components/BiometricEnrollmentPrompt', () => () => null);
jest.mock('../src/screens/VerifyEmailScreen', () => () => null);
jest.mock('../src/components/Skeleton', () => ({ AppSkeleton: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaProvider: ({ children }) => children, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/services/sessionStorage', () => ({
  loadSession: jest.fn(), loadProfileSessions: jest.fn(), storeSession: jest.fn(async () => {}), clearSession: jest.fn(async () => {}),
  expireProfileSession: jest.fn(), removeProfileSession: jest.fn(),
}));
jest.mock('../src/navigation/AppNavigator', () => {
  const { useOnboarding } = require('../src/contexts/OnboardingContext');
  return () => { mockState = useOnboarding(); return null; };
});
const user = { uuid: 'active-user', name: 'Ana', email: 'ana@example.test' };
const saved = { user, accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt: Date.now() + 600000 };
const rotated = { user, accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 900 };
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const originalFetch = global.fetch;
let renderer;
beforeEach(() => {
  jest.clearAllMocks(); mockRoute = null;
  loadSession.mockResolvedValue(saved); loadProfileSessions.mockResolvedValue([saved]);
});
afterEach(async () => { if (renderer) await act(() => renderer.unmount()); global.fetch = originalFetch; });

test('abrir um link durante a renovação preserva o provider e grava o refresh rotacionado da conta ativa', async () => {
  let finishRefresh;
  global.fetch = jest.fn(async (url, options) => {
    if (url.endsWith('/api/auth/refresh')) return new Promise(resolve => { finishRefresh = resolve; });
    if (url.endsWith('/api/check')) return response({}, options.headers.Authorization === 'Bearer old-access' ? 401 : 200);
    return response(user);
  });
  await act(async () => { renderer = TestRenderer.create(<App />); });
  expect(mockState.session.user.uuid).toBe(user.uuid);
  let pending;
  await act(async () => { pending = authenticatedFetch('/api/check', {}, 'old-access'); });
  expect(finishRefresh).toBeDefined();
  mockRoute = { kind: 'verify-email', token: '11111111-1111-4111-8111-111111111111.' + 'A'.repeat(43) };
  await act(async () => { renderer.update(<App />); });
  await act(async () => { finishRefresh(response(rotated)); expect((await pending).status).toBe(200); });
  expect(storeSession).toHaveBeenCalledWith(expect.objectContaining({ user, refreshToken: 'new-refresh' }));
  mockRoute = { kind: 'login' };
  await act(async () => { renderer.update(<App />); });
  expect(loadSession).toHaveBeenCalledTimes(1);
  expect(mockState.session.user.uuid).toBe(user.uuid);
  expect(mockState.session.refreshToken).toBe('new-refresh');
  expect(clearSession).not.toHaveBeenCalled();
});
