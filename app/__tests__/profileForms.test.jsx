import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import EditProfileScreen from '../src/screens/EditProfileScreen';
import ChangePasswordScreen from '../src/screens/ChangePasswordScreen';
import FormField from '../src/components/FormField';
import useToast from '../src/hooks/useToast';
import { validateProfile, validatePasswordChange } from '../src/utils/profileValidation';

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
async function passwords(current = 'antiga123', next = 'nova12345', confirmation = next) {
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
  await act(async () => button('Salvar alterações').props.onPress());
  expect(save).toHaveBeenCalledWith({ name: 'Lívia Matos', email: 'livia@example.com' });
  expect(back).toHaveBeenCalledTimes(1);
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

test('confirmação diferente impede envio e callback recebe só currentPassword/newPassword sem trim', async () => {
  const save = jest.fn(async () => {});
  await render(<ChangePasswordScreen onSave={save} onBack={jest.fn()} />);
  await passwords('antiga123', ' nova12345 ', 'diferente');
  await act(async () => button('Salvar nova senha').props.onPress());
  expect(error('Confirmar nova senha')).toBeTruthy(); expect(save).not.toHaveBeenCalled();
  await change('Confirmar nova senha', ' nova12345 ');
  await act(async () => button('Salvar nova senha').props.onPress());
  expect(save).toHaveBeenCalledWith({ currentPassword: 'antiga123', newPassword: ' nova12345 ' });
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
  expect(back).not.toHaveBeenCalled(); expect(input('Nova senha').props.value).toBe('nova12345');
  expect(button('Salvar nova senha').props.disabled).toBe(false);
  expect(useToast().showToast).toHaveBeenLastCalledWith({ type: 'error', message: 'Falha ao salvar' });
});

test('validação acompanha limites do cadastro e exige uma senha nova', () => {
  expect(validateProfile({ name: ' a ', email: 'x'.repeat(144) + '@a.com' }).name).toBeTruthy();
  expect(validateProfile({ name: 'Lívia', email: 'x'.repeat(145) + '@a.com' }).email).toBeTruthy();
  expect(validatePasswordChange({ currentPassword: '', newPassword: 'curta', confirmPassword: '' })).toHaveProperty('currentPassword');
  expect(validatePasswordChange({ currentPassword: 'mesma123', newPassword: 'mesma123', confirmPassword: 'mesma123' })).toHaveProperty('newPassword');
  expect(validatePasswordChange({ currentPassword: 'antiga123', newPassword: 'á'.repeat(37), confirmPassword: 'á'.repeat(37) })).toHaveProperty('newPassword');
  expect(validatePasswordChange({ currentPassword: 'antiga123', newPassword: 'á'.repeat(36), confirmPassword: 'á'.repeat(36) })).toEqual({});
});
