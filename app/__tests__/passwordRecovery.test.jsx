import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput, Text } from 'react-native';
import ForgotPasswordScreen from '../src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../src/screens/ResetPasswordScreen';
import FormField from '../src/components/FormField';
import useToast from '../src/hooks/useToast';
import { requestPasswordReset, resetPassword } from '../src/services/auth';
import { clearSession } from '../src/services/sessionStorage';
import { configureAuth } from '../src/services/apiClient';
import { parseRecoveryLink, RECOVERY_MESSAGE } from '../src/utils/passwordRecovery';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/services/sessionStorage', () => ({ clearSession: jest.fn(async () => {}) }));
jest.mock('../src/hooks/useToast', () => { const showToast = jest.fn(); return { __esModule: true, default: () => ({ showToast }) }; });
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Svg: Shape, G: Shape, Path: Shape, Circle: Shape, Line: Shape, Polyline: Shape, Rect: Shape };
});

const token = 'A'.repeat(43);
const originalFetch = global.fetch;
let renderer;
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const emptyResponse = () => ({ ok: true, status: 200, json: async () => { throw new Error('No body'); } });
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && node.props.onPress)[0];
const input = label => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label);
const fieldError = label => renderer.root.findAllByType(FormField).find(node => node.props.label === label).props.error;
const texts = () => renderer.root.findAllByType(Text).map(node => node.props.children);
async function render(screen) { await act(async () => { renderer = TestRenderer.create(screen); }); }
async function change(label, value) { await act(async () => input(label).props.onChangeText(value)); }
async function passwords(next = 'NovaSenha123!', confirmation = next) {
  await change('Nova senha', next); await change('Confirmar nova senha', confirmation);
}

beforeEach(() => { jest.clearAllMocks(); global.fetch = jest.fn().mockResolvedValue(emptyResponse()); });
afterEach(async () => { await act(async () => renderer?.unmount()); renderer = undefined; global.fetch = originalFetch; jest.useRealTimers(); });

test('solicita link com POST público, email normalizado e resposta sem body', async () => {
  const resolver = jest.fn(); const disconnect = configureAuth(resolver);
  try {
    await requestPasswordReset({ email: ' LIVIA@example.com ' });
    expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/auth/forgot-password', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ email: 'livia@example.com' }),
    }));
    expect(global.fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    expect(global.fetch.mock.calls[0][1].headers).not.toHaveProperty('access_token');
    expect(resolver).not.toHaveBeenCalled();
  } finally { disconnect(); }
});

test('reset envia apenas token/newPassword, preserva espaços e não autentica nem renova em 401', async () => {
  await resetPassword({ token, newPassword: ' NovaSenha123! ', confirmPassword: 'não enviar' });
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/auth/reset-password', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ token, newPassword: ' NovaSenha123! ' }),
  }));
  expect(global.fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  global.fetch.mockClear();
  global.fetch.mockResolvedValue(response({ fieldErrors: { token: 'Link inválido.' } }, 401));
  const resolver = jest.fn(); const disconnect = configureAuth(resolver);
  try {
    await expect(resetPassword({ token, newPassword: 'NovaSenha123!' })).rejects.toMatchObject({ status: 401 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(resolver).not.toHaveBeenCalled();
  } finally { disconnect(); }
});

test.each(['Ab1!', 'abcdefgh1!', 'Abcdefgh!', 'Abcdefg1', 'Á'.repeat(36) + '1!'])('service bloqueia senha inválida %s antes da request', async newPassword => {
  await expect(resetPassword({ token, newPassword })).rejects.toMatchObject({ fieldErrors: { newPassword: expect.any(String) } });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('service bloqueia e-mail e token inválidos', async () => {
  await expect(requestPasswordReset({ email: 'invalido' })).rejects.toMatchObject({ fieldErrors: { email: expect.any(String) } });
  await expect(resetPassword({ token: 'invalid', newPassword: 'NovaSenha123!' })).rejects.toMatchObject({ fieldErrors: { token: expect.any(String) } });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('solicitação começa com email preenchido, mostra confirmação genérica e espera 60s para reenviar', async () => {
  jest.useFakeTimers();
  await render(<ForgotPasswordScreen route={{ params: { email: 'livia@example.com' } }} onBack={jest.fn()} />);
  expect(input('E-mail').props.value).toBe('livia@example.com');
  await act(async () => button('Enviar link de recuperação').props.onPress());
  expect(texts()).toContain(RECOVERY_MESSAGE);
  expect(button('Reenviar em 60s').props.disabled).toBe(true);
  expect(useToast().showToast).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'success', message: RECOVERY_MESSAGE }));
  for (let second = 0; second < 60; second++) { await act(async () => jest.advanceTimersByTime(1000)); }
  expect(button('Reenviar link').props.disabled).toBe(false);
  await act(async () => button('Reenviar link').props.onPress());
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('email inválido bloqueia envio; erros da API aparecem no campo e no toast genérico', async () => {
  await render(<ForgotPasswordScreen onBack={jest.fn()} />);
  await change('E-mail', 'invalid');
  await act(async () => button('Enviar link de recuperação').props.onPress());
  expect(fieldError('E-mail')).toBeTruthy(); expect(global.fetch).not.toHaveBeenCalled();
  await change('E-mail', 'livia@example.com');
  global.fetch.mockResolvedValue(response({ fieldErrors: { email: 'Confira este e-mail.' } }, 400));
  await act(async () => button('Enviar link de recuperação').props.onPress());
  expect(fieldError('E-mail')).toBe('Confira este e-mail.');
  expect(input('E-mail').props.value).toBe('livia@example.com');
  expect(useToast().showToast).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'error', message: 'Não foi possível solicitar o link. Tente novamente.' }));
});

test('redefinição bloqueia senhas diferentes e só envia após confirmação válida', async () => {
  await render(<ResetPasswordScreen token={token} onBack={jest.fn()} onRequestLink={jest.fn()} />);
  await passwords('NovaSenha123!', 'OutraSenha123!');
  await act(async () => button('Redefinir senha').props.onPress());
  expect(fieldError('Confirmar nova senha')).toBeTruthy();
  expect(global.fetch).not.toHaveBeenCalled();
  await change('Confirmar nova senha', 'NovaSenha123!');
  await act(async () => button('Redefinir senha').props.onPress());
  expect(global.fetch.mock.calls[0][1].body).toBe(JSON.stringify({ token, newPassword: 'NovaSenha123!' }));
  expect(clearSession).toHaveBeenCalledTimes(1);
  expect(texts()).toContain('Senha redefinida.');
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test('link expirado oferece solicitar outro sem apagar a sessão local', async () => {
  const requestLink = jest.fn();
  global.fetch.mockResolvedValue(response({ fieldErrors: { token: 'Link expirado. Solicite outro.' } }, 400));
  await render(<ResetPasswordScreen token={token} onBack={jest.fn()} onRequestLink={requestLink} />);
  await passwords();
  await act(async () => button('Redefinir senha').props.onPress());
  expect(texts()).toContain('Precisamos de um novo link.');
  expect(texts()).toContain('Link expirado. Solicite outro.');
  expect(clearSession).not.toHaveBeenCalled();
  await act(async () => button('Solicitar novo link').props.onPress());
  expect(requestLink).toHaveBeenCalledTimes(1);
});

test('link sem token não exibe inputs nem faz request', async () => {
  await render(<ResetPasswordScreen onBack={jest.fn()} onRequestLink={jest.fn()} />);
  expect(texts()).toContain('Precisamos de um novo link.');
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('erro de senha do backend fica abaixo do input e preserva dados para corrigir', async () => {
  global.fetch.mockResolvedValue(response({ fieldErrors: { newPassword: 'Senha recusada pela API.' } }, 400));
  await render(<ResetPasswordScreen token={token} onBack={jest.fn()} onRequestLink={jest.fn()} />);
  await passwords();
  await act(async () => button('Redefinir senha').props.onPress());
  expect(fieldError('Nova senha')).toBe('Senha recusada pela API.');
  expect(input('Nova senha').props.value).toBe('NovaSenha123!');
  expect(clearSession).not.toHaveBeenCalled();
});

test('reset bloqueia envio duplicado, preserva campos em erro de conexão e permite tentar novamente', async () => {
  let fail;
  global.fetch.mockImplementationOnce(() => new Promise((resolve, reject) => { fail = reject; }));
  await render(<ResetPasswordScreen token={token} onBack={jest.fn()} onRequestLink={jest.fn()} />);
  await passwords();
  let pending;
  await act(async () => { pending = button('Redefinir senha').props.onPress(); });
  await act(async () => input('Confirmar nova senha').props.onSubmitEditing());
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(button('Redefinir senha').props.disabled).toBe(true);
  await act(async () => { fail(new TypeError('Network failed')); await pending; });
  expect(input('Nova senha').props.value).toBe('NovaSenha123!');
  expect(clearSession).not.toHaveBeenCalled();
  expect(texts()).toContain('Não foi possível conectar à API. Confira sua conexão e tente novamente.');
  expect(useToast().showToast).toHaveBeenLastCalledWith(expect.objectContaining({
    type: 'error', message: 'Não foi possível conectar à API. Confira sua conexão e tente novamente.',
  }));
  await act(async () => button('Redefinir senha').props.onPress());
  expect(texts()).toContain('Senha redefinida.');
});

test('falha ao limpar armazenamento após sucesso não apresenta a senha como não redefinida', async () => {
  clearSession.mockRejectedValueOnce(new Error('Storage unavailable'));
  await render(<ResetPasswordScreen token={token} onBack={jest.fn()} onRequestLink={jest.fn()} />);
  await passwords();
  await act(async () => button('Redefinir senha').props.onPress());
  expect(texts()).toContain('Senha redefinida.');
  expect(useToast().showToast).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'success' }));
});

test.each([
  [`https://vikash.example/reset-password?token=${token}`, { kind: 'reset', token }],
  [`http://192.168.1.8:5173/reset-password?token=${token}`, { kind: 'reset', token }],
  [`exp://192.168.1.8:8081/--/reset-password?token=${token}`, { kind: 'reset', token }],
  [`vikash://reset-password?token=${token}`, { kind: 'reset', token }],
  ['vikash://login', { kind: 'login' }],
  ['/forgot-password', { kind: 'forgot' }],
  ['/reset-password', { kind: 'reset', token: '' }],
  ['/reset-password?token=%E0%A4%A', { kind: 'reset', token: '' }],
  [`/reset-password?token=${token}&token=other`, { kind: 'reset', token: '' }],
  ['https://vikash.example/other?token=abc', null],
])('interpreta a URL %s', (url, expected) => { expect(parseRecoveryLink(url)).toEqual(expected); });
