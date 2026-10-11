jest.mock('../src/hooks/useToast', () => () => ({ showToast: jest.fn() }));
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { FlatList, Text } from 'react-native';
import CreditCardDetailsScreen from '../src/screens/CreditCardDetailsScreen';
import ConfirmationDialog from '../src/components/ConfirmationDialog';
import { fetchCreditCardDetails, deleteCreditCardInvoice } from '../src/services/creditCards';
import { fetchTransactions } from '../src/services/transactions';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/services/creditCards', () => ({ fetchCreditCardDetails: jest.fn(), deleteCreditCardInvoice: jest.fn() }));
jest.mock('../src/services/transactions', () => ({ fetchTransactions: jest.fn() }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Path: Shape, Rect: Shape, Circle: Shape, Line: Shape, Polyline: Shape };
});
const invoices = ['2026-10', '2026-09'].map((referenceMonth, index) => ({ uuid: `invoice-${index}`, referenceMonth, total: 600, closingDate: `${referenceMonth}-03`, dueDate: `${referenceMonth}-10`, status: index ? 'PAID' : 'OPEN' }));
const card = { uuid: 'card', lastFourDigits: 32, creditLimit: 5000, availableLimit: 4400, closingDay: 3, dueDay: 10, financialInstitution: { name: 'Inter' }, currentInvoiceUuid: 'invoice-0', invoices };
const row = id => ({ id, description: `Compra ${id}`, amount: 50, date: '2026-10-02', type: 'EXPENSE', category: 'Saúde', color: 'sage', icon: 'health', payment: 'Crédito' });
let renderer;
function button(label) { return renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]; }
function statement() { return renderer.root.findAllByType(FlatList).find(node => typeof node.props.onEndReached === 'function'); }
beforeEach(() => {
  deleteCreditCardInvoice.mockReset().mockResolvedValue(null);
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
  const mountedStatement = statement().instance;
  await act(async () => {
    statement().props.onLayout({ nativeEvent: { layout: { height: 640 } } });
    statement().props.onScroll({ nativeEvent: { contentOffset: { y: 210 } } });
    statement().props.onContentSizeChange(360, 950);
  });
  expect(statement().props.contentContainerStyle).toEqual(expect.arrayContaining([expect.objectContaining({ minHeight: 950 })]));
  await act(async () => statement().props.onEndReached());
  expect(fetchTransactions).toHaveBeenCalledTimes(2);
  fetchTransactions.mockResolvedValueOnce({ rows: [row('paid')], page: 0, hasNext: false });
  await act(async () => button('Fatura Set 2026').props.onPress());
  expect(fetchTransactions).toHaveBeenLastCalledWith('token', 0, expect.anything(), '/api/credit-card/card/invoices/invoice-1/transactions');
  expect(statement().props.data.map(item => item.id)).toEqual(['paid']);
  expect(statement().instance).toBe(mountedStatement);
  expect(statement().props.contentContainerStyle).toEqual(expect.arrayContaining([expect.objectContaining({ minHeight: 950 })]));
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

const emptyInvoice = { ...invoices[0], total: 0, initialAmount: 0, deletable: true };
const deletionDialog = () => renderer.root.findAllByType(ConfirmationDialog).find(node => node.props.title === 'Excluir fatura?');

test.each([
  { total: 600, deletable: false },
  { total: 0, deletable: false },
  { total: 0, deletable: undefined },
  { total: 600, deletable: true },
])('mostra exclusão apenas quando a API confirma fatura vazia e total zero: %p', async eligibility => {
  fetchCreditCardDetails.mockResolvedValue({ ...card, invoices: [{ ...emptyInvoice, ...eligibility }] });
  await open();
  expect(button('Excluir fatura')).toBeUndefined();
});

test('excluir fatura exige confirmação e permite cancelar sem enviar requisição', async () => {
  fetchCreditCardDetails.mockResolvedValue({ ...card, invoices: [emptyInvoice] });
  await open();
  await act(async () => button('Excluir fatura').props.onPress());
  expect(deletionDialog().props.visible).toBe(true);
  expect(deletionDialog().props.message).toContain('Out 2026');
  expect(deletionDialog().props.message).toContain('limite do cartão permanecem iguais');
  expect(deleteCreditCardInvoice).not.toHaveBeenCalled();
  await act(async () => deletionDialog().props.onCancel());
  expect(deletionDialog().props.visible).toBe(false);
});

test('exclusão recarrega faturas, seleciona outra e avisa o dashboard', async () => {
  const onDeleted = jest.fn();
  fetchCreditCardDetails.mockResolvedValueOnce({ ...card, invoices: [emptyInvoice, invoices[1]] });
  await act(async () => { renderer = TestRenderer.create(<CreditCardDetailsScreen uuid="card" accessToken="token" onDeleted={onDeleted} />); });
  await act(async () => button('Excluir fatura').props.onPress());
  fetchCreditCardDetails.mockResolvedValue({ ...card, invoices: [invoices[1]], currentInvoiceUuid: null });
  await act(async () => deletionDialog().props.onConfirm());
  expect(deleteCreditCardInvoice).toHaveBeenCalledWith('invoice-0', 'token');
  expect(onDeleted).toHaveBeenCalledTimes(1);
  expect(button('Fatura Out 2026')).toBeUndefined();
  expect(button('Fatura Set 2026').props.accessibilityState.selected).toBe(true);
  expect(fetchTransactions).toHaveBeenLastCalledWith('token', 0, expect.anything(), '/api/credit-card/card/invoices/invoice-1/transactions');
});

test('excluir a última fatura mostra o estado vazio sem consultar a fatura removida', async () => {
  fetchCreditCardDetails.mockResolvedValueOnce({ ...card, invoices: [emptyInvoice] });
  await open();
  await act(async () => button('Excluir fatura').props.onPress());
  fetchCreditCardDetails.mockResolvedValue({ ...card, invoices: [], currentInvoiceUuid: null });
  await act(async () => deletionDialog().props.onConfirm());
  expect(button('Excluir fatura')).toBeUndefined();
  expect(fetchTransactions).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType(Text).some(node => node.props.children === 'Este cartão ainda não tem faturas. Elas aparecerão ao registrar compras no crédito.')).toBe(true);
});

test('impede exclusão duplicada e mantém a fatura e a confirmação em caso de falha', async () => {
  let reject;
  deleteCreditCardInvoice.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  fetchCreditCardDetails.mockResolvedValue({ ...card, invoices: [emptyInvoice] });
  await open();
  await act(async () => button('Excluir fatura').props.onPress());
  let pending;
  await act(async () => { pending = deletionDialog().props.onConfirm(); deletionDialog().props.onConfirm(); });
  expect(deleteCreditCardInvoice).toHaveBeenCalledTimes(1);
  expect(deletionDialog().props.loading).toBe(true);
  await act(async () => deletionDialog().props.onCancel());
  expect(deletionDialog().props.visible).toBe(true);
  await act(async () => { reject(new Error('Esta fatura agora possui compras.')); await pending; });
  expect(deletionDialog().props.error).toBe('Esta fatura agora possui compras.');
  expect(deletionDialog().props.loading).toBe(false);
  expect(button('Fatura Out 2026')).toBeDefined();
  expect(fetchCreditCardDetails).toHaveBeenCalledTimes(1);
  fetchCreditCardDetails.mockResolvedValue({ ...card, invoices: [], currentInvoiceUuid: null });
  await act(async () => deletionDialog().props.onConfirm());
  expect(deleteCreditCardInvoice).toHaveBeenCalledTimes(2);
  expect(button('Fatura Out 2026')).toBeUndefined();
});
