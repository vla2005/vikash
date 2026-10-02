import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import MainTabs from '../src/navigation/MainTabs';
import BottomNavigator from '../src/components/BottomNavigator';
import VoiceDrawer from '../src/components/VoiceDrawer';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20, left: 0, right: 0 }) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Svg: Shape, Path: Shape, Rect: Shape, Circle: Shape, Line: Shape, Polyline: Shape };
});
jest.mock('../src/hooks/useReducedMotion', () => () => true);

let renderer;
afterEach(async () => { if (renderer) { await act(() => renderer.unmount()); } });
function button(label) { return renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]; }
function labels() { return renderer.root.findAllByType(Text).map(node => node.props.children); }

test('as quatro abas mudam o conteudo e mantem a barra com estado selecionado', async () => {
  await act(() => { renderer = TestRenderer.create(<MainTabs />); });
  expect(labels()).toContain('HOME');
  for (const [tab, heading] of [['Extrato', 'EXTRATO'], ['Contas', 'CONTAS'], ['Categorias', 'CATEGORIAS'], ['Início', 'HOME']]) {
    await act(() => button(tab).props.onPress());
    expect(labels()).toContain(heading);
    expect(button(tab).props.accessibilityState.selected).toBe(true);
    expect(renderer.root.findAllByType(BottomNavigator)).toHaveLength(1);
    expect(button('Registrar por voz')).toBeDefined();
  }
});

test('microfone abre e fecha drawer sem mudar a aba nem simular gravacao', async () => {
  await act(() => { renderer = TestRenderer.create(<MainTabs />); });
  await act(() => button('Extrato').props.onPress());
  await act(() => button('Registrar por voz').props.onPress());
  expect(renderer.root.findByType(VoiceDrawer).props.visible).toBe(true);
  expect(renderer.root.findByType(BottomNavigator).props.selected).toBe('Statement');
  expect(labels()).toContain('O registro por voz estará disponível em breve.');
  await act(() => button('Fechar microfone').props.onPress());
  expect(renderer.root.findByType(VoiceDrawer).props.visible).toBe(false);
  expect(button('Extrato').props.accessibilityState.selected).toBe(true);
});
