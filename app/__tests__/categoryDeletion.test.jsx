import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Modal, PanResponder } from 'react-native';
import CategoriesScreen from '../src/screens/CategoriesScreen';
import CategoryFormScreen from '../src/screens/CategoryFormScreen';
import SelectionField from '../src/components/SelectionField';
import ConfirmationDialog from '../src/components/ConfirmationDialog';
import SwipeableRow from '../src/components/SwipeableRow';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));

jest.mock('../src/hooks/useReducedMotion', () => () => true);
jest.mock('../src/hooks/useToast', () => () => ({ showToast: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Path: Shape, Rect: Shape, Circle: Shape, Ellipse: Shape, Line: Shape, Polyline: Shape };
});
const categories = [{ uuid: 'pet-uuid', name: 'Pets', color: 'blue', icon: 'paw' }, { uuid: 'gym-uuid', name: 'Academia', color: 'rose', icon: 'dumbbell' }];
let renderer;
afterEach(async () => { if (renderer) { await act(async () => renderer.unmount()); } jest.restoreAllMocks(); });
const dialog = () => renderer.root.findByType(ConfirmationDialog);
const rows = () => renderer.root.findAllByType(SwipeableRow);

test('edit form offers confirmed deletion, preserves fields on error and has no icon/color search', async () => {
  const onDelete = jest.fn().mockRejectedValueOnce(new Error('Falha temporária')).mockResolvedValueOnce();
  await act(async () => { renderer = TestRenderer.create(<CategoryFormScreen category={categories[0]} existingCategories={categories} onSave={jest.fn()} onDelete={onDelete} />); });
  expect(renderer.root.findAllByType(SelectionField).every(field => !field.props.searchable)).toBe(true);
  const remove = renderer.root.findAll(node => node.props.accessibilityLabel === 'Excluir categoria' && node.props.onPress)[0];
  await act(async () => remove.props.onPress());
  expect(onDelete).not.toHaveBeenCalled();
  expect(dialog().props.message).toContain('lançamentos serão mantidos');
  await act(async () => dialog().props.onConfirm());
  expect(dialog().props.error).toBe('Falha temporária');
  expect(dialog().props.visible).toBe(true);
  expect(onDelete).toHaveBeenCalledWith(categories[0]);
  await act(async () => dialog().props.onConfirm());
  expect(dialog().props.visible).toBe(false);
});

test('create form has neither a delete action nor search inputs in the grids', async () => {
  await act(async () => { renderer = TestRenderer.create(<CategoryFormScreen existingCategories={categories} onSave={jest.fn()} onDelete={jest.fn()} />); });
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Excluir categoria')).toHaveLength(0);
  expect(renderer.root.findAllByType(SelectionField).every(field => !field.props.searchable)).toBe(true);
});

test('somente personalizadas revelam exclusao; cancelar preserva os dados sem executar a acao', async () => {
  const onDelete = jest.fn(); const onEdit = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<CategoriesScreen categories={categories} defaultCategories={[{ name: 'Mercado', icon: 'basket', color: 'ochre' }]} onDelete={onDelete} onEdit={onEdit} />); });
  expect(rows()).toHaveLength(2);
  await act(async () => rows()[0].props.onOpenChange(true));
  expect(rows()[0].props.open).toBe(true);
  await act(async () => rows()[1].props.onOpenChange(true));
  expect(rows()[0].props.open).toBe(false);
  expect(rows()[1].props.open).toBe(true);
  await act(async () => rows()[1].props.onAction());
  expect(onEdit).not.toHaveBeenCalled();
  expect(onDelete).not.toHaveBeenCalled();
  expect(dialog().props.visible).toBe(true);
  expect(dialog().props.message).toContain('Academia');
  await act(async () => dialog().props.onCancel());
  expect(dialog().props.visible).toBe(false);
  expect(onDelete).not.toHaveBeenCalled();
  expect(rows()).toHaveLength(2);
});

test('confirmacao envia UUID uma unica vez, bloqueia fechamento enquanto aguarda e permite repetir apos erro', async () => {
  let reject;
  const onDelete = jest.fn(() => new Promise((_, rejectAction) => { reject = rejectAction; }));
  await act(async () => { renderer = TestRenderer.create(<CategoriesScreen categories={categories} onDelete={onDelete} />); });
  await act(async () => rows()[0].props.onAction());
  let pending;
  await act(async () => { pending = dialog().props.onConfirm(); dialog().props.onConfirm(); });
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onDelete).toHaveBeenCalledWith(categories[0]);
  expect(dialog().props.loading).toBe(true);
  await act(async () => dialog().props.onCancel());
  expect(dialog().props.visible).toBe(true);
  await act(async () => { reject(new Error('Falha ao excluir')); await pending; });
  expect(dialog().props.visible).toBe(true);
  expect(dialog().props.error).toBe('Falha ao excluir');
  onDelete.mockResolvedValueOnce();
  await act(async () => dialog().props.onConfirm());
  expect(onDelete).toHaveBeenCalledTimes(2);
  expect(dialog().props.visible).toBe(false);
  // No optimistic removal: the list remains the responsibility of its data source.
  expect(rows()).toHaveLength(2);
});

test('gesto horizontal revela acao sem editar; movimento vertical permanece com a rolagem', async () => {
  const create = jest.spyOn(PanResponder, 'create'); const onOpenChange = jest.fn(); const onPress = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<SwipeableRow open={false} onOpenChange={onOpenChange} onPress={onPress} label="Pets" actionLabel="Excluir Pets" />); });
  const handlers = create.mock.calls[0][0];
  expect(handlers.onMoveShouldSetPanResponderCapture(null, { dx: -10, dy: 30 })).toBe(false);
  expect(handlers.onMoveShouldSetPanResponderCapture(null, { dx: 20, dy: 0 })).toBe(false);
  expect(handlers.onMoveShouldSetPanResponderCapture(null, { dx: -50, dy: 2 })).toBe(true);
  await act(async () => {
    handlers.onPanResponderGrant(); handlers.onPanResponderMove(null, { dx: -60 });
    handlers.onPanResponderRelease(null, { vx: -0.2 });
  });
  expect(onOpenChange).toHaveBeenCalledWith(true);
  expect(onPress).not.toHaveBeenCalled();
});

test('popup reutiliza mensagens e callbacks e permite cancelar pelo voltar do dispositivo', async () => {
  const onConfirm = jest.fn(); const onCancel = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<ConfirmationDialog visible title="Arquivar conta?" message="A conta será arquivada." confirmText="Arquivar" onConfirm={onConfirm} onCancel={onCancel} />); });
  const button = renderer.root.findAll(node => node.props.onPress === onConfirm)[0];
  await act(async () => button.props.onPress());
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await act(async () => renderer.root.findByType(Modal).props.onRequestClose());
  expect(onCancel).toHaveBeenCalledTimes(1);
});
