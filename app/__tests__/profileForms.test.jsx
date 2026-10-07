import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import EditProfileScreen from '../src/screens/EditProfileScreen';
import ChangePasswordScreen from '../src/screens/ChangePasswordScreen';
import FormField from '../src/components/FormField';
import useToast from '../src/hooks/useToast';
import { validateProfile, validatePasswordChange } from '../src/utils/profileValidation';
import { ApiError } from '../src/services/apiClient';
import { updatePassword, updateUser } from '../src/services/users';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));

jest.mock('../src/hooks/useToast', () => {
  const showToast = jest.fn();
  return { __esModule: true, default: () => ({ showToast }) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Svg: Shape, G: Shape, Path: Shape, Circle: Shape, Line: Shape, Polyline: Shape, Rect: Shape };
});

let renderer;
const originalFetch = global.fetch;
beforeEach(() => { useToast().showToast.mockClear(); global.fetch = jest.fn(); });
afterEach(async () => { await act(async () => renderer?.unmount()); global.fetch = originalFetch; });
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && node.props.onPress)[0];
const input = label => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label);
const error = label => renderer.root.findAllByType(FormField).find(node => node.props.label === label).props.error;
async function change(label, value) { await act(async () => input(label).props.onChangeText(value)); }
async function render(screen) { await act(async () => { renderer = TestRenderer.create(screen); }); }
async function passwords(current = 'antiga123', next = 'Nova12345!', confirmation = next) {
  await change('Senha atual', current); await change('Nova senha', next); await change('Confirmar nova senha', confirmation);
}

test('edição começa com dados reais e salvar sem callback mantém os dados sem requests ou sucesso', async () => {
  const profile = { name: 'Lívia Matos', email: 'livia@example.com' };
  const back = jest.fn();
  await render(<EditProfileScreen profile={profile} onBack={back} />);
  expect(input('Nome completo').props.value).toBe(profile.name);
  await change('Nome completo', 'Lívia Silva');
  await act(async () => button('Salvar alterações').props.onPress());
  expect(global.fetch).not.toHaveBeenCalled();
  expect(back).not.toHaveBeenCalled();
  expect(profile.name).toBe('Lívia Matos');
  expect(input('Nome completo').props.value).toBe('Lívia Silva');
  expect(useToast().showToast).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'info' }));
  await act(async () => button('Cancelar').props.onPress());
  expect(back).toHaveBeenCalledTimes(1);
});

test('nome e email inválidos impedem callback; futuro callback recebe só name e email normalizados', async () => {
  const save = jest.fn(async () => {}); const back = jest.fn();
  await render(<EditProfileScreen profile={{ name: '', email: '' }} onSave={save} onBack={back} />);
  await act(async () => button('Salvar alterações').props.onPress());
  expect(error('Nome completo')).toBeTruthy(); expect(error('E-mail')).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  await change('Nome completo', '  Lívia Matos  '); await change('E-mail', '  livia@example.com  ');
  await change('Senha atual', ' Senha123! ');
  await act(async () => button('Salvar alterações').props.onPress());
  expect(save).toHaveBeenCalledWith({ name: 'Lívia Matos', email: 'livia@example.com', password: ' Senha123! ' });
  expect(back).toHaveBeenCalledTimes(1);
});

test('perfil desatualizado revela o campo de senha quando a API pede confirmação', async () => {
  const save = jest.fn().mockRejectedValueOnce(new ApiError('Confirme a senha', 400, { password: 'Confirme sua senha atual.' })).mockResolvedValueOnce({});
  await render(<EditProfileScreen profile={{ name: 'Lívia', email: 'livia@example.com' }} onSave={save} onBack={jest.fn()} />);
  await change('Nome completo', 'Lívia Silva');
  await act(async () => button('Salvar alterações').props.onPress());
  expect(error('Senha atual')).toBe('Confirme sua senha atual.');
  await change('Senha atual', 'Password123!');
  await act(async () => button('Salvar alterações').props.onPress());
  expect(save).toHaveBeenLastCalledWith({ name: 'Lívia Silva', email: 'livia@example.com', password: 'Password123!' });
});

test('trocar email exige senha e erro da API aparece abaixo do campo', async () => {
  const save = jest.fn().mockRejectedValue(new ApiError('Senha incorreta', 400, { password: 'Confirme sua senha atual.' }));
  await render(<EditProfileScreen profile={{ name: 'Lívia', email: 'livia@example.com' }} onSave={save} onBack={jest.fn()} />);
  expect(input('Senha atual')).toBeUndefined();
  await change('E-mail', 'novo@example.com');
  await act(async () => button('Salvar alterações').props.onPress());
  expect(error('Senha atual')).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  await change('Senha atual', ' Password123! ');
  await act(async () => button('Salvar alterações').props.onPress());
  expect(save).toHaveBeenCalledWith({ name: 'Lívia', email: 'novo@example.com', password: ' Password123! ' });
  expect(error('Senha atual')).toBe('Confirme sua senha atual.');
});

test('senhas começam vazias, podem ser mostradas e salvar não faz requisição enquanto integração não existe', async () => {
  await render(<ChangePasswordScreen onBack={jest.fn()} />);
  expect(input('Senha atual').props.value).toBe(''); expect(input('Nova senha').props.secureTextEntry).toBe(true);
  await act(async () => button('Mostrar nova senha').props.onPress());
  expect(input('Nova senha').props.secureTextEntry).toBe(false);
  await passwords();
  await act(async () => button('Salvar nova senha').props.onPress());
  expect(global.fetch).not.toHaveBeenCalled();
  expect(useToast().showToast).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'info' }));
});

test('confirmação diferente impede envio e callback recebe só password/newPassword sem trim', async () => {
  const save = jest.fn(async () => {});
  await render(<ChangePasswordScreen onSave={save} onBack={jest.fn()} />);
  await passwords('antiga123', ' Nova12345! ', 'diferente');
  await act(async () => button('Salvar nova senha').props.onPress());
  expect(error('Confirmar nova senha')).toBeTruthy(); expect(save).not.toHaveBeenCalled();
  await change('Confirmar nova senha', ' Nova12345! ');
  await act(async () => button('Salvar nova senha').props.onPress());
  expect(save).toHaveBeenCalledWith({ password: 'antiga123', newPassword: ' Nova12345! ' });
});

test('futuro envio bloqueia duplicados e falha mantém inputs para nova tentativa', async () => {
  let reject;
  const save = jest.fn(() => new Promise((resolve, fail) => { reject = fail; }));
  const back = jest.fn();
  await render(<ChangePasswordScreen onSave={save} onBack={back} />);
  await passwords();
  let pending;
  await act(async () => { pending = button('Salvar nova senha').props.onPress(); });
  expect(button('Salvar nova senha').props.disabled).toBe(true);
  await act(async () => input('Confirmar nova senha').props.onSubmitEditing());
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new Error('Falha ao salvar')); await pending; });
  expect(back).not.toHaveBeenCalled(); expect(input('Nova senha').props.value).toBe('Nova12345!');
  expect(button('Salvar nova senha').props.disabled).toBe(false);
  expect(useToast().showToast).toHaveBeenLastCalledWith({ type: 'error', message: 'Não foi possível alterar sua senha. Tente novamente.' });
});

test('validação acompanha limites do cadastro e exige uma senha nova', () => {
  expect(validateProfile({ name: ' a ', email: 'x'.repeat(144) + '@a.com' }).name).toBeTruthy();
  expect(validateProfile({ name: 'Lívia', email: 'x'.repeat(145) + '@a.com' }).email).toBeTruthy();
  expect(validatePasswordChange({ currentPassword: '', newPassword: 'curta', confirmPassword: '' })).toHaveProperty('currentPassword');
  expect(validatePasswordChange({ currentPassword: 'mesma123', newPassword: 'mesma123', confirmPassword: 'mesma123' })).toHaveProperty('newPassword');
  expect(validatePasswordChange({ currentPassword: 'antiga123', newPassword: 'á'.repeat(37), confirmPassword: 'á'.repeat(37) })).toHaveProperty('newPassword');
  const boundaryPassword = 'Á' + 'á'.repeat(33) + 'ab1!';
  expect(validatePasswordChange({ currentPassword: 'antiga123', newPassword: boundaryPassword, confirmPassword: boundaryPassword })).toEqual({});
});

test.each(['Ab1!', 'abcdef1!', 'Abcdefg!', 'Abcdefg1'])('troca de senha bloqueia %s antes de chamar o service', async newPassword => {
  const save = jest.fn();
  await render(<ChangePasswordScreen onSave={save} onBack={jest.fn()} />);
  await passwords('old123', newPassword);
  await act(async () => button('Salvar nova senha').props.onPress());
  expect(error('Nova senha')).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('form envia PATCH somente após confirmar a nova senha e retorna ao perfil após sucesso', async () => {
  const back = jest.fn();
  global.fetch.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('No content'); } });
  await render(<ChangePasswordScreen onSave={values => updatePassword(values, 'token')} onBack={back} />);
  await passwords('old123', 'Nova12345!', 'diferente');
  await act(async () => button('Salvar nova senha').props.onPress());
  expect(error('Confirmar nova senha')).toBeTruthy();
  expect(global.fetch).not.toHaveBeenCalled();
  await change('Confirmar nova senha', 'Nova12345!');
  await act(async () => button('Salvar nova senha').props.onPress());
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/user/update-password', expect.objectContaining({
    method: 'PATCH', body: JSON.stringify({ password: 'old123', newPassword: 'Nova12345!' }),
  }));
  expect(back).toHaveBeenCalledTimes(1);
  expect(useToast().showToast).toHaveBeenLastCalledWith({ type: 'success', message: 'Senha alterada. Entre novamente.' });
});

test('erros da API para password aparecem na senha atual e mantêm o formulário aberto', async () => {
  const back = jest.fn();
  global.fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ fieldErrors: { password: 'Sua senha atual está incorreta.' } }) });
  await render(<ChangePasswordScreen onSave={values => updatePassword(values, 'token')} onBack={back} />);
  await passwords();
  await act(async () => button('Salvar nova senha').props.onPress());
  expect(error('Senha atual')).toBe('Sua senha atual está incorreta.');
  expect(back).not.toHaveBeenCalled();
  expect(useToast().showToast).toHaveBeenLastCalledWith({ type: 'error', message: 'Não foi possível alterar sua senha. Tente novamente.' });
});

test('falha de validação da API destaca os inputs e usa mensagem genérica no toast', async () => {
  const fieldErrors = { name: 'O nome precisa ter pelo menos 2 caracteres.', email: 'E-mail inválido.' };
  const save = jest.fn().mockRejectedValue(new ApiError('Confira os campos informados.', 400, fieldErrors));
  const back = jest.fn();
  await render(<EditProfileScreen profile={{ name: 'Lívia', email: 'livia@example.com' }} onSave={save} onBack={back} />);
  await act(async () => button('Salvar alterações').props.onPress());
  expect(error('Nome completo')).toBe(fieldErrors.name);
  expect(error('E-mail')).toBe(fieldErrors.email);
  expect(useToast().showToast).toHaveBeenLastCalledWith({ type: 'error', message: 'Não foi possível atualizar seu perfil. Tente novamente.' });
  expect(back).not.toHaveBeenCalled();
  await change('Nome completo', 'Lívia Matos');
  expect(error('Nome completo')).toBeUndefined();
  expect(error('E-mail')).toBe(fieldErrors.email);
});

test('email duplicado aparece abaixo do input, preserva valores e permite tentar novamente', async () => {
  global.fetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ fieldErrors: null }) });
  const back = jest.fn();
  await render(<EditProfileScreen profile={{ name: 'Lívia', email: 'livia@example.com' }}
    onSave={values => updateUser(values, 'token')} onBack={back} />);
  await act(async () => button('Salvar alterações').props.onPress());
  expect(error('E-mail')).toBe('Este e-mail já está sendo utilizado.');
  expect(error('Nome completo')).toBeUndefined();
  expect(input('E-mail').props.value).toBe('livia@example.com');
  expect(back).not.toHaveBeenCalled();
  expect(useToast().showToast).toHaveBeenLastCalledWith({ type: 'error', message: 'Não foi possível atualizar seu perfil. Tente novamente.' });
  await change('E-mail', 'livia.novo@example.com');
  await change('Senha atual', 'Senha123!');
  global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ name: 'Lívia', email: 'livia.novo@example.com' }) });
  await act(async () => button('Salvar alterações').props.onPress());
  expect(back).toHaveBeenCalledTimes(1);
  expect(useToast().showToast).toHaveBeenLastCalledWith({ type: 'success', message: 'Perfil atualizado.' });
});
