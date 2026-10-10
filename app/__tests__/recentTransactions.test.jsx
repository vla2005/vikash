import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import RecentTransactions from '../src/components/RecentTransactions';

jest.mock('../src/hooks/useReducedMotion', () => () => true);
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/components/CategoryIcon', () => 'CategoryIcon');

let renderer;
afterEach(() => { act(() => renderer?.unmount()); renderer = null; });
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const text = () => renderer.root.findAllByType(Text).map(node => node.props.children).flat().join(' ');
const rows = (prefix, type) => Array.from({ length: 7 }, (_, index) => ({ id: `${prefix}-${index}`, description: `${prefix} ${index}`,
  type, amount: 50, date: '2026-10-10', payment: type === 'CREDIT_PURCHASE' ? 'Crédito' : 'Pix', account: prefix }));

test('each tab shows at most five of its own movements and the chart tab remains independent', () => {
  const onOpenTransaction = jest.fn(); const onViewCards = jest.fn();
  act(() => { renderer = TestRenderer.create(<RecentTransactions rows={rows('Conta', 'EXPENSE')}
    creditRows={rows('Compra', 'CREDIT_PURCHASE')} onOpenTransaction={onOpenTransaction} onViewCards={onViewCards} />); });
  expect(text()).toContain('Conta 4');
  expect(text()).not.toContain('Conta 5');
  expect(text()).not.toContain('Compra 0');
  act(() => button('Mostrar compras recentes no crédito').props.onPress());
  expect(text()).toContain('Compra 4');
  expect(text()).not.toContain('Compra 5');
  expect(text()).not.toContain('Conta 0');
  act(() => button('Abrir lançamento Compra 0').props.onPress());
  expect(onOpenTransaction).toHaveBeenCalledWith(expect.objectContaining({ id: 'Compra-0' }));
  act(() => button('Ver cartões').props.onPress());
  expect(onViewCards).toHaveBeenCalledTimes(1);
});

test('credit loading and errors affect only the credit tab and use skeleton with retry', () => {
  const onRetryCredit = jest.fn();
  const props = { rows: rows('Conta', 'EXPENSE'), onRetryCredit };
  act(() => { renderer = TestRenderer.create(<RecentTransactions {...props} creditLoading />); });
  expect(text()).toContain('Conta 0');
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Carregando compras recentes')).toHaveLength(0);
  act(() => button('Mostrar compras recentes no crédito').props.onPress());
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Carregando compras recentes').length).toBeGreaterThan(0);
  expect(text()).not.toContain('aparecerão aqui');
  act(() => renderer.update(<RecentTransactions {...props} creditError="offline" />));
  expect(text()).toContain('Não foi possível carregar');
  act(() => button('Tentar carregar compras recentes').props.onPress());
  expect(onRetryCredit).toHaveBeenCalledTimes(1);
  act(() => button('Mostrar transações recentes das contas').props.onPress());
  expect(text()).toContain('Conta 0');
  expect(text()).not.toContain('Não foi possível carregar');
});

test('empty states identify the selected source and credit amounts stay hidden', () => {
  act(() => { renderer = TestRenderer.create(<RecentTransactions hidden />); });
  expect(text()).toContain('transações das contas aparecerão');
  act(() => button('Mostrar compras recentes no crédito').props.onPress());
  expect(text()).toContain('compras no crédito aparecerão');
  act(() => renderer.update(<RecentTransactions hidden creditRows={rows('Compra', 'CREDIT_PURCHASE')} />));
  expect(text()).toContain('••••••');
  expect(text()).not.toContain('R$');
});
