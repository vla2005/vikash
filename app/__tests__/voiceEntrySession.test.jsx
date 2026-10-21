import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Platform, Text } from 'react-native';
import {
  OnboardingProvider,
  useOnboarding,
} from '../src/contexts/OnboardingContext';
import {
  loadSession,
  loadProfileSessions,
} from '../src/services/sessionStorage';
import { fetchCurrentUser } from '../src/services/auth';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/services/sessionStorage', () => ({
  loadSession: jest.fn(),
  loadProfileSessions: jest.fn(),
  storeSession: jest.fn(),
}));
jest.mock('../src/services/auth', () => ({ fetchCurrentUser: jest.fn() }));
const original = Platform.OS;
let main, quick;
function Probe() {
  const value = useOnboarding();
  return <Text>{value?.session?.user?.name || 'loading'}</Text>;
}
beforeEach(() => {
  Platform.OS = 'android';
  loadSession.mockResolvedValue({
    accessToken: 'a',
    expiresAt: Date.now() + 600000,
    user: { uuid: 'user', name: 'Pessoa', email: 'x@test' },
  });
  loadProfileSessions.mockResolvedValue([]);
  fetchCurrentUser.mockResolvedValue({
    uuid: 'user',
    name: 'Pessoa',
    email: 'x@test',
  });
  jest.clearAllMocks();
});
afterEach(async () => {
  await act(async () => {
    main?.unmount();
    quick?.unmount();
  });
  main = quick = null;
  Platform.OS = original;
});
test('dashboard and compact activity share one session restoration', async () => {
  await act(async () => {
    main = renderer.create(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );
  });
  await act(async () => {
    quick = renderer.create(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );
  });
  expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
  expect(quick.root.findByType(Text).props.children).toBe('Pessoa');
});
test('surviving root restores ownership safely when the other activity disappears', async () => {
  await act(async () => {
    quick = renderer.create(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );
  });
  await act(async () => {
    main = renderer.create(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );
  });
  await act(async () => {
    quick.unmount();
  });
  quick = null;
  expect(fetchCurrentUser).toHaveBeenCalledTimes(2);
  expect(main.root.findByType(Text).props.children).toBe('Pessoa');
});
