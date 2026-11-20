import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Platform, Text } from 'react-native';
import VerifyEmailScreen from '../src/screens/VerifyEmailScreen';
import { verifyRegistrationEmail } from '../src/services/auth';
import { parseRecoveryLink } from '../src/utils/passwordRecovery';

jest.mock('../src/services/auth', () => ({ verifyRegistrationEmail: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const token = '11111111-1111-4111-8111-111111111111.' + 'A'.repeat(43);
let renderer;
beforeEach(() => { jest.clearAllMocks(); verifyRegistrationEmail.mockResolvedValue(); });
afterEach(async () => { if (renderer) await act(() => renderer.unmount()); renderer = undefined; });
async function render(element) { await act(async () => { renderer = TestRenderer.create(element); }); }
const labels = () => renderer.root.findAllByType(Text).map(node => node.props.children);
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && node.props.onPress)[0];

test('aceita App Link Android e esquema instalado, sem aceitar domínio externo', () => {
  for (const prefix of ['https://api-vikash.viktorware.com/verify-email', 'vikash://verify-email', 'exp://192.168.1.7:8092/--/verify-email']) {
    expect(parseRecoveryLink(`${prefix}?token=${token}`)).toEqual({ kind: 'verify-email', token });
  }
  expect(parseRecoveryLink(`https://attacker.test/verify-email?token=${token}`)).toBeNull();
  expect(parseRecoveryLink(`http://api-vikash.viktorware.com/verify-email?token=${token}`)).toBeNull();
});
test('token duplicado ou incompleto chega à tela como inválido, sem ser escolhido arbitrariamente', () => {
  expect(parseRecoveryLink(`vikash://verify-email?token=${token}&token=other`)).toEqual({ kind: 'verify-email', token: '' });
  expect(parseRecoveryLink('vikash://verify-email?token=%E0%A4%A')).toEqual({ kind: 'verify-email', token: '' });
});
test('abertura do link confirma dentro do app e mostra sucesso somente depois da API', async () => {
  let finish;
  verifyRegistrationEmail.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const back = jest.fn();
  await render(<VerifyEmailScreen token={token} onBack={back} />);
  expect(labels()).toContain('Verificando seu e-mail…');
  expect(labels()).not.toContain('E-mail confirmado.');
  expect(verifyRegistrationEmail).toHaveBeenCalledWith(token);
  await act(async () => { finish(); });
  expect(labels()).toContain('E-mail confirmado.');
  await act(async () => { button('Continuar no ViKash').props.onPress(); });
  expect(back).toHaveBeenCalledTimes(1);
});
test('link inválido não faz requisição nem tenta confirmar externamente', async () => {
  await render(<VerifyEmailScreen token="invalid" onBack={jest.fn()} />);
  expect(labels()).toContain('Precisamos de um novo link.');
  expect(verifyRegistrationEmail).not.toHaveBeenCalled();
});
test('expiração e uso anterior são tratados sem informar sucesso', async () => {
  verifyRegistrationEmail.mockRejectedValue(Object.assign(new Error('sensitive-token-do-not-display'), { status: 400 }));
  await render(<VerifyEmailScreen token={token} onBack={jest.fn()} />);
  expect(labels()).toContain('Precisamos de um novo link.');
  expect(JSON.stringify(labels())).not.toContain('sensitive-token-do-not-display');
});
test('falha de rede permite tentar novamente sem apagar a conta ativa', async () => {
  verifyRegistrationEmail.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce();
  await render(<VerifyEmailScreen token={token} onBack={jest.fn()} />);
  expect(labels()).toContain('Vamos tentar novamente.');
  await act(async () => { button('Tentar novamente').props.onPress(); });
  expect(labels()).toContain('E-mail confirmado.');
});
test('web não consome o token: só apresenta a opção de abrir o aplicativo', async () => {
  const original = Platform.OS; Platform.OS = 'web';
  try {
    await render(<VerifyEmailScreen token={token} onBack={jest.fn()} />);
    expect(labels()).toContain('Continue no aplicativo.');
    expect(verifyRegistrationEmail).not.toHaveBeenCalled();
  } finally { Platform.OS = original; }
});
