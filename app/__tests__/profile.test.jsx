import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import ProfileScreen from '../src/screens/ProfileScreen';
import ConfirmationDialog from '../src/components/ConfirmationDialog';
import { getProfileInitials } from '../src/utils/profile';
jest.mock('../src/hooks/useToast', () => () => ({ showToast: jest.fn() }));
jest.mock('../src/hooks/useReducedMotion', () => () => true);
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 20 }) }));
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Svg: Shape, G: Shape, Path: Shape };
});
let renderer;
afterEach(async () => { await act(async () => renderer?.unmount()); });
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && node.props.onPress)[0];

test('perfil usa nome e e-mail reais e confirma antes de sair, bloqueando duplicados', async () => {
  let finish;
  const logout = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { renderer = TestRenderer.create(<ProfileScreen profile={{ name: 'Lívia Matos', email: 'livia@example.com' }} onLogout={logout} />); });
  const texts = renderer.root.findAllByType(Text).map(node => node.props.children);
  expect(texts).toEqual(expect.arrayContaining(['Lívia Matos', 'livia@example.com', 'LM']));
  await act(async () => button('Sair da conta').props.onPress());
  expect(logout).not.toHaveBeenCalled();
  let pending;
  await act(async () => { pending = renderer.root.findByType(ConfirmationDialog).props.onConfirm(); });
  expect(renderer.root.findByType(ConfirmationDialog).props.loading).toBe(true);
  await act(async () => renderer.root.findByType(ConfirmationDialog).props.onConfirm());
  expect(logout).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); await pending; });
  expect(renderer.root.findByType(ConfirmationDialog).props.visible).toBe(false);
});

test('erro de logout mantém popup com mensagem e permite nova tentativa', async () => {
  const logout = jest.fn().mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValueOnce();
  await act(async () => { renderer = TestRenderer.create(<ProfileScreen profile={{ name: 'Viktor Lucena' }} onLogout={logout} />); });
  await act(async () => button('Sair da conta').props.onPress());
  await act(async () => renderer.root.findByType(ConfirmationDialog).props.onConfirm());
  expect(renderer.root.findByType(ConfirmationDialog).props).toMatchObject({ visible: true, loading: false, error: 'Sem conexão' });
  await act(async () => renderer.root.findByType(ConfirmationDialog).props.onConfirm());
  expect(logout).toHaveBeenCalledTimes(2);
  expect(renderer.root.findByType(ConfirmationDialog).props.visible).toBe(false);
});

test.each([[' Viktor  Lucena ', 'VL'], ['Viktor', 'V'], ['', 'V']])('iniciais de %s', (name, expected) => {
  expect(getProfileInitials(name)).toBe(expected);
});
