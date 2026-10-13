import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { ToastProvider } from '../src/contexts/ToastContext';
import useToast from '../src/hooks/useToast';
import Toast, { toastVariants } from '../src/components/Toast';
import Icon from '../src/components/Icon';
import { toast as toastTokens } from '../src/theme/silver';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24 }) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Path: Shape, Rect: Shape, Circle: Shape, Line: Shape, Polyline: Shape };
});
let api;
function Observer() { api = useToast(); return <Text>Conteúdo da tela</Text>; }
let renderer;
beforeEach(() => jest.useFakeTimers());
afterEach(async () => { if (renderer) { await act(async () => renderer.unmount()); } jest.clearAllTimers(); jest.useRealTimers(); });

test('toast sobrevive a troca da tela e fecha automaticamente', async () => {
  await act(async () => { renderer = TestRenderer.create(<ToastProvider><Observer /></ToastProvider>); });
  await act(async () => api.showToast({ type: 'success', message: 'Cadastro realizado', duration: 2000 }));
  await act(async () => renderer.update(<ToastProvider><Observer /><Text>Nova tela</Text></ToastProvider>));
  expect(renderer.root.findByType(Toast).props.message).toBe('Cadastro realizado');
  await act(async () => jest.advanceTimersByTime(2000));
  expect(renderer.root.findAllByType(Toast)).toHaveLength(0);
});

test('novo toast substitui anterior, reinicia tempo e permite fechar manualmente', async () => {
  await act(async () => { renderer = TestRenderer.create(<ToastProvider><Observer /></ToastProvider>); });
  await act(async () => api.showToast({ type: 'error', message: 'Falha', duration: 2000 }));
  await act(async () => jest.advanceTimersByTime(1000));
  await act(async () => api.showToast({ type: 'info', message: 'Nova informação', duration: 3000 }));
  await act(async () => jest.advanceTimersByTime(1000));
  expect(renderer.root.findByType(Toast).props.message).toBe('Nova informação');
  await act(async () => renderer.root.findByType(Toast).props.onClose());
  expect(renderer.root.findAllByType(Toast)).toHaveLength(0);
});

test.each(['success', 'error', 'warn', 'info'])('suporta estado %s com mensagem acessivel', async type => {
  await act(async () => { renderer = TestRenderer.create(<ToastProvider><Observer /></ToastProvider>); });
  await act(async () => api.showToast({ type, message: 'Mensagem da ação' }));
  expect(renderer.root.findByType(Toast).props.type).toBe(type);
  expect(toastVariants[type].color).toBeDefined();
  const notification = renderer.root.findByType(Toast);
  expect(notification.findByType(Icon).props.color).toBe(toastVariants[type].color);
  const card = renderer.root.findAll(node => node.props.testID === 'toast')[0];
  expect(StyleSheet.flatten(card.props.style).backgroundColor).toBe(toastTokens.fill);
  expect(StyleSheet.flatten(card.props.style).borderColor).toBeUndefined();
  notification.findAllByType(Text).forEach(text => {
    expect(StyleSheet.flatten(text.props.style).color).toBe(toastTokens.text);
  });
  expect(renderer.root.findAllByType(Text).map(item => item.props.children)).toContain('Mensagem da ação');
});

test('confirmação compacta fecha pelo toque e erros mantêm a explicação acessível', async () => {
  await act(async () => { renderer = TestRenderer.create(<ToastProvider><Observer /></ToastProvider>); });
  await act(async () => api.showToast({ type: 'success', title: 'Perfil atualizado!', message: 'Suas alterações foram salvas.' }));
  const alert = () => renderer.root.findAll(node => node.props.testID === 'toast')[0];
  expect(alert().props.accessibilityLabel).toBe('Perfil atualizado!');
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).not.toContain('Suas alterações foram salvas.');
  await act(async () => renderer.root.findAllByProps({ accessibilityLabel: 'Fechar notificação' })[0].props.onPress());
  expect(renderer.root.findAllByType(Toast)).toHaveLength(0);
  await act(async () => api.showToast({ type: 'error', title: 'Não foi possível salvar', message: 'Confira sua conexão e tente novamente.' }));
  expect(alert().props.accessibilityLabel).toContain('Confira sua conexão e tente novamente.');
  expect(alert().props.accessibilityLiveRegion).toBe('assertive');
});
