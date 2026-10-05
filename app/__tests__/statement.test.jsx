import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text, TextInput } from 'react-native';
import StatementScreen from '../src/screens/StatementScreen';
import { fetchTransactions } from '../src/services/transactions';
jest.mock('../src/services/transactions', () => ({ fetchTransactions: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/components/CategoryIcon', () => 'CategoryIcon');
jest.mock('../src/components/BrandLogo', () => 'BrandLogo');
let renderer;
const originalFetch = global.fetch;
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const texts = () => renderer.root.findAllByType(Text).map(node => node.props.children);
const input = label => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label);
beforeEach(async () => {
  global.fetch = jest.fn();
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  fetchTransactions.mockReset();
  fetchTransactions.mockResolvedValue({ page: 0, hasNext: false, rows: [
    { id: 'one', description: 'Almoço', date, amount: 45, type: 'EXPENSE', account: 'Itaú', category: 'Alimentação', payment: 'Débito', color: 'peach', icon: 'food' },
    { id: 'two', description: 'Salário', date, amount: 4200, type: 'INCOME', account: 'Santander', category: 'Receitas', payment: 'Transferência', color: null, icon: null },
    { id: 'three', description: 'Pix para Marcos', date, amount: 400, type: 'EXPENSE', account: 'Mercado Pago', category: null, payment: 'Pix', color: null, icon: null },
  ] });
  await act(async () => { renderer = TestRenderer.create(<StatementScreen profile={{ name: 'Viktor Lucena' }} accessToken="test-access" />); });
});
afterEach(async () => { await act(async () => renderer.unmount()); global.fetch = originalFetch; });

test('consulta primeira pagina com token e filtra dados do servidor localmente', async () => {
  expect(fetchTransactions).toHaveBeenCalledWith('test-access', 0, expect.anything());
  expect(texts()).toContain('Almoço');
  await act(async () => input('Buscar lançamento').props.onChangeText('almoco'));
  expect(texts()).toContain('Almoço');
  expect(texts()).not.toContain('Salário');
  await act(async () => button('Próximo mês').props.onPress());
  expect(texts()).toContain('Nenhum lançamento encontrado');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('rolagem carrega proxima pagina uma vez, evita duplicados e respeita last', async () => {
  const date = new Date();
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  await act(async () => renderer.unmount());
  fetchTransactions.mockReset();
  const first = { id: 'one', description: 'Primeiro', date: day, amount: 10, type: 'EXPENSE' };
  fetchTransactions.mockResolvedValueOnce({ rows: [first], page: 0, hasNext: true });
  let finish;
  fetchTransactions.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { renderer = TestRenderer.create(<StatementScreen accessToken="test-access" />); });
  const scroll = () => renderer.root.findAll(node => node.props.accessibilityLabel === 'Lista de transações' && typeof node.props.onScroll === 'function')[0];
  const event = { nativeEvent: { layoutMeasurement: { height: 600 }, contentOffset: { y: 600 }, contentSize: { height: 1200 } } };
  await act(async () => { scroll().props.onScroll(event); scroll().props.onScroll(event); });
  expect(fetchTransactions).toHaveBeenCalledTimes(2);
  expect(fetchTransactions).toHaveBeenLastCalledWith('test-access', 1, expect.anything());
  await act(async () => finish({ page: 1, hasNext: false, rows: [first, { ...first, id: 'two', description: 'Segundo' }] }));
  expect(texts().filter(text => text === 'Primeiro')).toHaveLength(1);
  expect(texts()).toContain('Segundo');
  await act(async () => scroll().props.onScroll(event));
  expect(fetchTransactions).toHaveBeenCalledTimes(2);
});

test('falha na consulta nao mostra mocks e permite tentar a mesma pagina', async () => {
  await act(async () => renderer.unmount());
  fetchTransactions.mockReset();
  fetchTransactions.mockRejectedValueOnce(new Error('Falha de conexão'));
  fetchTransactions.mockResolvedValueOnce({ page: 0, hasNext: false, rows: [] });
  await act(async () => { renderer = TestRenderer.create(<StatementScreen accessToken="test-access" />); });
  expect(texts()).toContain('Falha de conexão');
  expect(texts()).not.toContain('Almoço');
  await act(async () => button('Tentar carregar extrato novamente').props.onPress());
  expect(texts()).toContain('Nenhum lançamento encontrado');
  expect(fetchTransactions.mock.calls.map(call => call[1])).toEqual([0, 0]);
});

test('camada escura cobre toda a tela e permite fechar o drawer', async () => {
  await act(async () => button('Abrir filtros do extrato').props.onPress());
  const backdrop = button('Fechar filtros');
  expect(StyleSheet.flatten(backdrop.props.style)).toMatchObject({
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(16, 29, 62, 0.64)',
  });
  await act(async () => backdrop.props.onPress());
  expect(button('Fechar filtros')).toBeUndefined();
});

test('cancelar descarta o rascunho; aplicar filtra e reabrir preserva selecao', async () => {
  await act(async () => button('Abrir filtros do extrato').props.onPress());
  await act(async () => button('accounts: Itaú').props.onPress());
  await act(async () => button('Cancelar filtros').props.onPress());
  expect(texts()).toContain('Salário');
  await act(async () => button('Abrir filtros do extrato').props.onPress());
  expect(button('accounts: Itaú').props.accessibilityState.checked).toBe(false);
  await act(async () => button('accounts: Itaú').props.onPress());
  await act(async () => button('payments: Débito').props.onPress());
  await act(async () => button('Aplicar filtros').props.onPress());
  expect(texts()).toContain('Almoço');
  expect(texts()).not.toContain('Salário');
  expect(texts()).not.toContain('Pix para Marcos');
  await act(async () => button('Abrir filtros do extrato').props.onPress());
  expect(button('accounts: Itaú').props.accessibilityState.checked).toBe(true);
  await act(async () => button('Limpar filtros').props.onPress());
  await act(async () => button('Aplicar filtros').props.onPress());
  expect(texts()).toContain('Salário');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('intervalo de valor invalido nao fecha drawer e categorias combinam com valor', async () => {
  await act(async () => button('Abrir filtros do extrato').props.onPress());
  await act(async () => { input('Valor mínimo').props.onChangeText('100'); input('Valor máximo').props.onChangeText('50'); });
  await act(async () => button('Aplicar filtros').props.onPress());
  expect(texts()).toContain('Informe valores positivos e um máximo maior ou igual ao mínimo.');
  await act(async () => { input('Valor mínimo').props.onChangeText('40'); input('Valor máximo').props.onChangeText('50'); });
  await act(async () => button('Selecionar categorias do filtro').props.onPress());
  await act(async () => button('categories: Alimentação').props.onPress());
  await act(async () => button('Aplicar filtros').props.onPress());
  expect(texts()).toContain('Almoço');
  expect(texts()).not.toContain('Salário');
  expect(global.fetch).not.toHaveBeenCalled();
});
