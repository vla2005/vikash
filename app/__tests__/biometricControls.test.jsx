import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Platform, Switch } from 'react-native';
import LoginScreen from '../src/screens/LoginScreen';
import BiometricSettings from '../src/components/BiometricSettings';
import BiometricEnrollmentPrompt from '../src/components/BiometricEnrollmentPrompt';
import { useOnboarding } from '../src/contexts/OnboardingContext';

jest.mock('../src/contexts/OnboardingContext', () => ({ useOnboarding: jest.fn() }));
jest.mock('../src/hooks/useToast', () => ({ __esModule: true, default: () => ({ showToast: jest.fn() }) }));
jest.mock('../src/components/Screen', () => ({ children }) => <>{children}</>);
jest.mock('../src/components/BrandLogo', () => () => null);
jest.mock('../src/components/FormField', () => 'FormField');
jest.mock('../src/components/ProfileSwitcherDrawer', () => () => null);
jest.mock('../src/components/ConfirmationDialog', () => 'ConfirmationDialog');
let renderer, auth;
const navigation = { reset: jest.fn(), navigate: jest.fn() };
const profile = { id: 'ana', name: 'Ana', email: 'ana@example.test', biometricEnabled: true };
beforeEach(() => {
  jest.clearAllMocks();
  auth = { profiles: [profile], preferredBiometricProfileId: 'ana', biometricAvailable: true,
    loginWithBiometrics: jest.fn(async () => {}), setBiometricEnabled: jest.fn(async () => {}), session: { biometricEnabled: true } };
  useOnboarding.mockImplementation(() => auth);
});
afterEach(async () => { if (renderer) await act(() => renderer.unmount()); });
async function render(element) { await act(async () => { renderer = TestRenderer.create(element); }); }
function biometricButton() { return renderer.root.findAll(node => node.props.accessibilityLabel === 'Entrar com biometria' && node.props.onPress)[0]; }

test('login oferece botão escrito Entrar com biometria apenas para conta habilitada', async () => {
  auth.session = null;
  await render(<LoginScreen navigation={navigation} />);
  expect(biometricButton()).toBeTruthy();
  await act(async () => { await biometricButton().props.onPress(); });
  expect(auth.loginWithBiometrics).toHaveBeenCalledWith('ana');
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Home' }] });
});
test('não oferece biometria para outra conta preenchida no formulário', async () => {
  await render(<LoginScreen navigation={navigation} route={{ params: { email: 'other@example.test' } }} />);
  expect(biometricButton()).toBeUndefined();
});
test('conta sem habilitação não recebe botão biométrico', async () => {
  auth.profiles = [{ ...profile, biometricEnabled: false }];
  await render(<LoginScreen navigation={navigation} />);
  expect(biometricButton()).toBeUndefined();
});
test('configurações refletem a preferência e enviam a alteração sem otimista falsa', async () => {
  await render(<BiometricSettings />);
  const toggle = renderer.root.findByType(Switch);
  expect(toggle.props.value).toBe(true);
  await act(async () => { await toggle.props.onValueChange(false); });
  expect(auth.setBiometricEnabled).toHaveBeenCalledWith(false);
});
test('web não oferece um toggle de biometria sem suporte', async () => {
  const previous = Platform.OS; Platform.OS = 'web';
  try { await render(<BiometricSettings />); expect(renderer.toJSON()).toBeNull(); }
  finally { Platform.OS = previous; }
});
test('convite permanece fechado antes de um login válido', async () => {
  auth.biometricOffer = false;
  await render(<BiometricEnrollmentPrompt />);
  expect(renderer.root.findByType('ConfirmationDialog').props.visible).toBe(false);
});
