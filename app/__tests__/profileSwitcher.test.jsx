import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import ProfileSwitcherDrawer from '../src/components/ProfileSwitcherDrawer';
import ConfirmationDialog from '../src/components/ConfirmationDialog';

jest.mock('../src/hooks/useReducedMotion', () => () => true);
jest.mock('../src/hooks/useToast', () => () => ({ showToast: jest.fn() }));
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Svg: Shape, G: Shape, Path: Shape };
});
const profiles = [{ id: 'a', name: 'Ana', email: 'ana@example.com' }, { id: 'b', name: 'Bruno', email: 'bruno@example.com' }];
let renderer;
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && node.props.onPress)[0];
const labels = () => renderer.root.findAllByType(Text).map(node => node.props.children);
const base = () => ({ visible: true, profiles, activeProfileId: 'a', onClose: jest.fn(), onSelect: jest.fn(), onAdd: jest.fn(), onOpenProfile: jest.fn(), onLogout: jest.fn(), onRequireLogin: jest.fn() });
async function render(props) { await act(() => { renderer = TestRenderer.create(<ProfileSwitcherDrawer {...props} />); }); }
afterEach(async () => { await act(() => renderer?.unmount()); });

test('identifica perfil ativo e conserva o acesso a meu perfil e adicionar conta', async () => {
  const props = base(); await render(props);
  expect(labels()).toEqual(expect.arrayContaining(['Ana', 'Bruno', 'Em uso']));
  expect(button('Usar perfil de Ana, ana@example.com').props.disabled).toBe(true);
  await act(() => button('Abrir meu perfil').props.onPress()); expect(props.onOpenProfile).toHaveBeenCalled();
  await act(() => button('Adicionar conta').props.onPress()); expect(props.onAdd).toHaveBeenCalled();
});

test('troca pendente bloqueia duplicados; erro preserva o drawer e permite tentar de novo', async () => {
  const props = base(); let fail;
  props.onSelect.mockImplementationOnce(() => new Promise((resolve, reject) => { fail = reject; })).mockResolvedValue();
  await render(props); let pending;
  await act(() => { pending = button('Usar perfil de Bruno, bruno@example.com').props.onPress(); });
  expect(button('Adicionar conta').props.disabled).toBe(true);
  await act(() => button('Usar perfil de Bruno, bruno@example.com').props.onPress());
  expect(props.onSelect).toHaveBeenCalledTimes(1);
  await act(async () => { fail(new Error('Sem conexão')); await pending; });
  expect(labels()).toContain('Sem conexão'); expect(props.onClose).not.toHaveBeenCalled();
  await act(() => button('Usar perfil de Bruno, bruno@example.com').props.onPress());
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test('perfil expirado abre login daquele e-mail sem tentar acessar dados', async () => {
  const props = base(); props.profiles = [profiles[0], { ...profiles[1], requiresLogin: true }];
  await render(props);
  await act(() => button('Usar perfil de Bruno, bruno@example.com').props.onPress());
  expect(props.onSelect).not.toHaveBeenCalled(); expect(props.onRequireLogin).toHaveBeenCalledWith(props.profiles[1]);
});

test('sair requer confirmação e bloqueia envio duplicado; cancelar não desconecta', async () => {
  const props = base(); let finish;
  props.onLogout.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await render(props);
  await act(() => button('Sair da conta de Bruno').props.onPress());
  const dialog = () => renderer.root.findByType(ConfirmationDialog);
  expect(dialog().props.visible).toBe(true);
  await act(() => dialog().props.onCancel()); expect(props.onLogout).not.toHaveBeenCalled();
  await act(() => button('Sair da conta de Bruno').props.onPress()); let pending;
  await act(() => { pending = dialog().props.onConfirm(); });
  await act(() => dialog().props.onConfirm()); expect(props.onLogout).toHaveBeenCalledTimes(1);
  expect(props.onLogout).toHaveBeenCalledWith('b');
  await act(async () => { finish(); await pending; }); expect(dialog().props.visible).toBe(false);
});
