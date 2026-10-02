import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import MainTabs from '../src/navigation/MainTabs';
import BottomNavigator from '../src/components/BottomNavigator';
import VoiceDrawer from '../src/components/VoiceDrawer';
import useToast from '../src/hooks/useToast';
jest.mock('../src/hooks/useToast', () => { const showToast = jest.fn(); return { __esModule: true, default: () => ({ showToast }) }; });
import { createCategory, fetchCategories, updateCategory } from '../src/services/categories';

jest.mock('../src/services/categories', () => ({ createCategory: jest.fn(async values => ({ ...values })), fetchCategories: jest.fn(), updateCategory: jest.fn(async () => null) }));
jest.mock('../src/contexts/OnboardingContext', () => ({ useOnboarding: () => ({ session: { accessToken: 'test-access' } }) }));

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20, left: 0, right: 0 }) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Svg: Shape, Path: Shape, Rect: Shape, Circle: Shape, Ellipse: Shape, Line: Shape, Polyline: Shape };
});
jest.mock('../src/hooks/useReducedMotion', () => () => true);

let renderer;
beforeEach(() => {
  fetchCategories.mockReset();
  fetchCategories.mockResolvedValue({ defaultCategories: [{ name: 'Saúde', icon: 'health', color: 'sage' }, { name: 'Mercado', icon: 'basket', color: 'ochre' }], customCategories: [] });
});
afterEach(async () => { if (renderer) { await act(async () => renderer.unmount()); } });
function button(label) { return renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]; }
function labels() { return renderer.root.findAllByType(Text).map(node => node.props.children); }

test('as quatro abas mudam o conteudo e mantem a barra com estado selecionado', async () => {
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  expect(labels()).toContain('HOME');
  for (const [tab, heading] of [['Extrato', 'EXTRATO'], ['Contas', 'CONTAS'], ['Categorias', 'Categorias'], ['Início', 'HOME']]) {
    await act(async () => button(tab).props.onPress());
    expect(labels()).toContain(heading);
    expect(button(tab).props.accessibilityState.selected).toBe(true);
    expect(renderer.root.findAllByType(BottomNavigator)).toHaveLength(1);
    expect(button('Registrar por voz')).toBeDefined();
  }
});

test('microfone abre e fecha drawer sem mudar a aba nem simular gravacao', async () => {
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Extrato').props.onPress());
  await act(async () => button('Registrar por voz').props.onPress());
  expect(renderer.root.findByType(VoiceDrawer).props.visible).toBe(true);
  expect(renderer.root.findByType(BottomNavigator).props.selected).toBe('Statement');
  expect(labels()).toContain('O registro por voz estará disponível em breve.');
  await act(async () => button('Fechar microfone').props.onPress());
  expect(renderer.root.findByType(VoiceDrawer).props.visible).toBe(false);
  expect(button('Extrato').props.accessibilityState.selected).toBe(true);
});

test('cria e edita categoria pela API usando UUID e consulta novamente a listagem', async () => {
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Categorias').props.onPress());
  await act(async () => button('Criar categoria').props.onPress());
  await act(async () => button('Criar categoria').props.onPress());
  expect(labels()).toContain('Informe um nome com pelo menos 2 caracteres.');
  const input = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onChangeText === 'function')[0];
  await act(async () => input('Nome da categoria').props.onChangeText('Pets'));
  await act(async () => button('Ícone Pets').props.onPress());
  await act(async () => button('Cor Azul').props.onPress());
  fetchCategories.mockResolvedValue({ defaultCategories: [{ name: 'Saúde', icon: 'health', color: 'sage' }, { name: 'Mercado', icon: 'basket', color: 'ochre' }], customCategories: [{ uuid: 'a446ab36-bd34-42db-a899-cb5ddab93f09', name: 'Pets', icon: 'paw', color: 'blue' }] });
  await act(async () => button('Criar categoria').props.onPress());
  expect(labels()).toContain('Pets');
  expect(createCategory).toHaveBeenCalledWith({ name: 'Pets', icon: 'paw', color: 'blue' }, 'test-access');
  await act(async () => button('Editar categoria Pets').props.onPress());
  expect(input('Nome da categoria').props.value).toBe('Pets');
  expect(button('Ícone Pets').props.accessibilityState.selected).toBe(true);
  expect(button('Cor Azul').props.accessibilityState.selected).toBe(true);
  await act(async () => input('Nome da categoria').props.onChangeText('Saude'));
  await act(async () => button('Salvar categoria').props.onPress());
  expect(labels()).toContain('Já existe uma categoria com esse nome.');
  await act(async () => input('Nome da categoria').props.onChangeText('Meus pets'));
  updateCategory.mockRejectedValueOnce(new Error('Falha ao atualizar'));
  await act(async () => button('Salvar categoria').props.onPress());
  expect(labels()).toContain('Falha ao atualizar');
  expect(input('Nome da categoria').props.value).toBe('Meus pets');
  fetchCategories.mockResolvedValue({ defaultCategories: [{ name: 'Saúde', icon: 'health', color: 'sage' }, { name: 'Mercado', icon: 'basket', color: 'ochre' }], customCategories: [{ uuid: 'a446ab36-bd34-42db-a899-cb5ddab93f09', name: 'Meus pets', icon: 'paw', color: 'blue' }] });
  await act(async () => button('Salvar categoria').props.onPress());
  expect(updateCategory).toHaveBeenCalledWith('a446ab36-bd34-42db-a899-cb5ddab93f09', { name: 'Meus pets', icon: 'paw', color: 'blue' }, 'test-access');
  expect(useToast().showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Categoria atualizada!' }));
  await act(async () => input('Buscar categoria').props.onChangeText('PETS'));
  expect(labels()).toContain('Meus pets');
  expect(labels()).not.toContain('Mercado');
  await act(async () => input('Buscar categoria').props.onChangeText('saude'));
  expect(labels()).toContain('Saúde');
  expect(labels()).not.toContain('Pets');
});

test('falha de rede mantem o formulario aberto com os dados para tentar novamente', async () => {
  createCategory.mockRejectedValueOnce(new Error('Falha de conexão'));
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Categorias').props.onPress());
  await act(async () => button('Criar categoria').props.onPress());
  const input = renderer.root.findAll(node => node.props.accessibilityLabel === 'Nome da categoria' && typeof node.props.onChangeText === 'function')[0];
  await act(async () => input.props.onChangeText('Viagens'));
  await act(async () => button('Criar categoria').props.onPress());
  expect(labels()).toContain('Falha de conexão');
  expect(useToast().showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Falha de conexão' }));
  expect(labels()).toContain('Nova categoria');
  fetchCategories.mockResolvedValue({ defaultCategories: [], customCategories: [{ name: 'Viagens', icon: 'paw', color: 'sage' }] });
  await act(async () => button('Criar categoria').props.onPress());
  expect(labels()).toContain('Viagens');
  expect(labels()).not.toContain('Nova categoria');
});

test('resposta do POST nao entra na lista quando GET nao retorna a categoria', async () => {
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Categorias').props.onPress());
  await act(async () => button('Criar categoria').props.onPress());
  const input = renderer.root.findAll(node => node.props.accessibilityLabel === 'Nome da categoria' && typeof node.props.onChangeText === 'function')[0];
  await act(async () => input.props.onChangeText('Nao consultada'));
  await act(async () => button('Criar categoria').props.onPress());
  expect(labels()).not.toContain('Nao consultada');
  expect(fetchCategories).toHaveBeenCalledTimes(2);
});

test('falha da consulta mostra erro sem categorias padrao locais', async () => {
  fetchCategories.mockRejectedValueOnce(new Error('Consulta indisponível'));
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Categorias').props.onPress());
  expect(labels()).toContain('Consulta indisponível');
  expect(labels()).not.toContain('Saúde');
  expect(labels()).not.toContain('Mercado');
});
