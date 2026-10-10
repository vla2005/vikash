jest.mock('../src/hooks/useToast', () => () => ({ showToast: jest.fn() }));
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { FlatList, Text } from 'react-native';
import CreditCardDetailsScreen from '../src/screens/CreditCardDetailsScreen';
import { fetchCreditCardDetails } from '../src/services/creditCards';
import { fetchTransactions } from '../src/services/transactions';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/services/creditCards', () => ({ fetchCreditCardDetails: jest.fn() }));
jest.mock('../src/services/transactions', () => ({ fetchTransactions: jest.fn() }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Path: Shape, Rect: Shape, Circle: Shape, Line: Shape, Polyline: Shape };
});
const invoices = ['2026-10', '2026-09'].map((referenceMonth, index) => ({ uuid: `invoice-${index}`, referenceMonth, total: 600, closingDate: `${referenceMonth}-03`, dueDate: `${referenceMonth}-10`, status: index ? 'PAID' : 'OPEN' }));
const card = { uuid: 'card', description: 'Meu Inter', creditLimit: 5000, availableLimit: 4400, closingDay: 3, dueDay: 10, financialInstitution: { name: 'Inter' }, currentInvoiceUuid: 'invoice-0', invoices };
const row = id => ({ id, description: `Compra ${id}`, amount: 50, date: '2026-10-02', type: 'EXPENSE', category: 'Saúde', color: 'sage', icon: 'health', payment: 'Crédito' });
let renderer;
function button(label) { return renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]; }
function statement() { return renderer.root.findAllByType(FlatList).find(node => typeof node.props.onEndReached === 'function'); }
beforeEach(() => {
  fetchCreditCardDetails.mockReset().mockResolvedValue(card);
  fetchTransactions.mockReset().mockResolvedValue({ rows: [row('a')], page: 0, hasNext: true });
});
afterEach(async () => { await act(async () => renderer?.unmount()); });
async function open() { await act(async () => { renderer = TestRenderer.create(<CreditCardDetailsScreen uuid="card" accessToken="token" onBack={() => {}} />); }); }

test('busca somente fatura selecionada, pagina ao rolar e reinicia ao trocar a fatura', async () => {
  await open();
  expect(fetchTransactions).toHaveBeenCalledTimes(1);
  expect(fetchTransactions).toHaveBeenLastCalledWith('token', 0, expect.anything(), '/api/credit-card/card/invoices/invoice-0/transactions');
  fetchTransactions.mockResolvedValueOnce({ rows: [row('b')], page: 1, hasNext: false });
  await act(async () => statement().props.onEndReached());
  expect(statement().props.data.map(item => item.id)).toEqual(['a', 'b']);
  await act(async () => statement().props.onEndReached());
  expect(fetchTransactions).toHaveBeenCalledTimes(2);
  fetchTransactions.mockResolvedValueOnce({ rows: [row('paid')], page: 0, hasNext: false });
  await act(async () => button('Fatura Set 2026').props.onPress());
  expect(fetchTransactions).toHaveBeenLastCalledWith('token', 0, expect.anything(), '/api/credit-card/card/invoices/invoice-1/transactions');
  expect(statement().props.data.map(item => item.id)).toEqual(['paid']);
});

test('cancela consulta antiga e ignora resposta atrasada ao selecionar outra fatura', async () => {
  let resolveOld;
  fetchTransactions.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  await open();
  const oldSignal = fetchTransactions.mock.calls[0][2];
  fetchTransactions.mockResolvedValueOnce({ rows: [row('new')], page: 0, hasNext: false });
  await act(async () => button('Fatura Set 2026').props.onPress());
  expect(oldSignal.aborted).toBe(true);
  await act(async () => resolveOld({ rows: [row('old')], page: 0, hasNext: true }));
  expect(statement().props.data.map(item => item.id)).toEqual(['new']);
});

test('erro na proxima pagina preserva lancamentos e permite repetir a mesma pagina', async () => {
  await open();
  fetchTransactions.mockRejectedValueOnce(new Error('Falha temporária'));
  await act(async () => statement().props.onEndReached());
  expect(statement().props.data).toHaveLength(1);
  fetchTransactions.mockResolvedValueOnce({ rows: [row('b')], page: 1, hasNext: false });
  await act(async () => renderer.root.findAll(node => node.props.onPress && node.findAllByType(Text).some(text => text.props.children === 'Tentar novamente'))[0].props.onPress());
  expect(fetchTransactions).toHaveBeenLastCalledWith('token', 1, expect.anything(), '/api/credit-card/card/invoices/invoice-0/transactions');
  expect(statement().props.data).toHaveLength(2);
});

test('cartao sem fatura nao consulta transacoes', async () => {
  fetchCreditCardDetails.mockResolvedValue({ ...card, invoices: [], currentInvoiceUuid: null });
  await open();
  expect(fetchTransactions).not.toHaveBeenCalled();
});

test('extrato identifica a parcela da compra na fatura selecionada', async () => {
  fetchTransactions.mockResolvedValue({ rows: [{ ...row('parcel'), installmentNumber: 2, installmentCount: 3 }], page: 0, hasNext: false });
  await open();
  const text = renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join('')).join(' ');
  expect(text).toContain('Parcela 2/3');
});
