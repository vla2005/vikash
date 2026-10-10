import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import ConfirmationDialog from '../src/components/ConfirmationDialog';
import DeleteTransactionButton from '../src/components/DeleteTransactionButton';
import PagedTransactionList from '../src/components/PagedTransactionList';
import RecentTransactions from '../src/components/RecentTransactions';
import SwipeableRow from '../src/components/SwipeableRow';
import { deleteTransaction, deleteCreditCardPurchase, fetchTransactions } from '../src/services/transactions';
import useToast from '../src/hooks/useToast';

jest.mock('../src/services/transactions', () => ({ deleteTransaction: jest.fn(), deleteCreditCardPurchase: jest.fn(), fetchTransactions: jest.fn() }));
jest.mock('../src/hooks/useToast', () => jest.fn());
jest.mock('../src/hooks/useReducedMotion', () => () => true);
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/components/CategoryIcon', () => 'CategoryIcon');

let renderer;
let showToast;
const item = { id: 'transaction-uuid', uuid: 'transaction-uuid', description: 'Farmácia', amount: 50, type: 'EXPENSE', date: '2026-10-09', payment: 'Pix', color: 'mint', icon: 'plus', account: 'Inter' };
const dialog = () => renderer.root.findByType(ConfirmationDialog);
const rows = () => renderer.root.findAllByType(SwipeableRow);

beforeEach(() => { jest.clearAllMocks(); showToast = jest.fn(); useToast.mockReturnValue({ showToast }); });
afterEach(async () => { if (renderer) { await act(async () => renderer.unmount()); renderer = null; } });

test('detail delete requires confirmation; cancelling sends nothing', async () => {
  const onDeleted = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<DeleteTransactionButton details={item} accessToken="token" onDeleted={onDeleted} />); });
  await act(async () => renderer.root.findAll(node => ['Excluir compra', 'Excluir transação'].includes(node.props.accessibilityLabel) && typeof node.props.onPress === 'function')[0].props.onPress());
  expect(dialog().props.visible).toBe(true);
  expect(dialog().props.message).toContain('saldo da conta será revertido');
  expect(deleteTransaction).not.toHaveBeenCalled();
  await act(async () => dialog().props.onCancel());
  expect(dialog().props.visible).toBe(false);
  expect(onDeleted).not.toHaveBeenCalled();
});

test('pending confirmation prevents double delete and dismissal; error permits retry', async () => {
  let reject;
  deleteTransaction.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  const onDeleted = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<DeleteTransactionButton details={item} accessToken="token" onDeleted={onDeleted} />); });
  await act(async () => renderer.root.findAll(node => ['Excluir compra', 'Excluir transação'].includes(node.props.accessibilityLabel) && typeof node.props.onPress === 'function')[0].props.onPress());
  let pending;
  await act(async () => { pending = dialog().props.onConfirm(); dialog().props.onConfirm(); });
  expect(deleteTransaction).toHaveBeenCalledTimes(1);
  expect(deleteTransaction).toHaveBeenCalledWith('transaction-uuid', 'token');
  await act(async () => dialog().props.onCancel());
  expect(dialog().props.loading).toBe(true);
  expect(dialog().props.visible).toBe(true);
  await act(async () => { reject(new Error('Não foi possível conectar.')); await pending; });
  expect(dialog().props.error).toBe('Não foi possível conectar.');
  expect(dialog().props.visible).toBe(true);
  expect(onDeleted).not.toHaveBeenCalled();
  expect(showToast).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'error' }));
  deleteTransaction.mockResolvedValueOnce();
  await act(async () => dialog().props.onConfirm());
  expect(dialog().props.visible).toBe(false);
  expect(onDeleted).toHaveBeenCalledTimes(1);
  expect(showToast).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'success' }));
});

test('purchase detail uses full purchase UUID and amount and warns about all installments', async () => {
  deleteCreditCardPurchase.mockResolvedValueOnce();
  await act(async () => { renderer = TestRenderer.create(<DeleteTransactionButton details={{ ...item, uuid: 'purchase', amount: 300 }} purchase accessToken="token" />); });
  await act(async () => renderer.root.findAll(node => ['Excluir compra', 'Excluir transação'].includes(node.props.accessibilityLabel) && typeof node.props.onPress === 'function')[0].props.onPress());
  expect(dialog().props.message).toContain('300,00');
  expect(dialog().props.message).toContain('todas as suas parcelas');
  await act(async () => dialog().props.onConfirm());
  expect(deleteCreditCardPurchase).toHaveBeenCalledWith('purchase', 'token');
  expect(deleteTransaction).not.toHaveBeenCalled();
});

test.each([
  ['TRANSFER', 'duas contas'],
  ['INVOICE_PAYMENT', 'fatura ficará fechada'],
])('confirmation describes financial reversal for %s', async (type, message) => {
  await act(async () => { renderer = TestRenderer.create(<DeleteTransactionButton details={{ ...item, type }} accessToken="token" />); });
  await act(async () => renderer.root.findAll(node => ['Excluir compra', 'Excluir transação'].includes(node.props.accessibilityLabel) && typeof node.props.onPress === 'function')[0].props.onPress());
  expect(dialog().props.message).toContain(message);
});

test('invoice swipe deletes the purchase UUID, resets pagination and never presents installment amount as full purchase', async () => {
  const parcel = { ...item, id: 'installment', purchaseUuid: 'purchase', installmentCount: 3, installmentNumber: 1, amount: 100 };
  fetchTransactions.mockResolvedValueOnce({ rows: [parcel], page: 0, hasNext: true });
  deleteCreditCardPurchase.mockResolvedValueOnce();
  const onDeleted = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<PagedTransactionList accessToken="token" endpoint="/invoice" onDeleted={onDeleted} />); });
  await act(async () => rows()[0].props.onOpenChange(true));
  expect(rows()[0].props.open).toBe(true);
  await act(async () => rows()[0].props.onAction());
  expect(rows()[0].props.open).toBe(false);
  expect(dialog().props.message).toContain('compra inteira');
  expect(dialog().props.message).not.toContain('100,00');
  fetchTransactions.mockResolvedValueOnce({ rows: [], page: 0, hasNext: false });
  await act(async () => dialog().props.onConfirm());
  expect(deleteCreditCardPurchase).toHaveBeenCalledWith('purchase', 'token');
  expect(fetchTransactions).toHaveBeenLastCalledWith('token', 0, expect.anything(), '/invoice');
  expect(rows()).toHaveLength(0);
  expect(onDeleted).toHaveBeenCalledTimes(1);
});

test('recent movements open details and statement without offering deletion', async () => {
  const onOpenTransaction = jest.fn();
  const onViewStatement = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<RecentTransactions rows={[item]} onOpenTransaction={onOpenTransaction} onViewStatement={onViewStatement} />); });
  expect(rows()).toHaveLength(0);
  expect(renderer.root.findAllByType(ConfirmationDialog)).toHaveLength(0);
  await act(async () => renderer.root.findAll(node => node.props.accessibilityLabel === 'Abrir lançamento Farmácia' && typeof node.props.onPress === 'function')[0].props.onPress());
  expect(onOpenTransaction).toHaveBeenCalledWith(item);
  await act(async () => renderer.root.findAll(node => node.props.accessibilityLabel === 'Ver extrato' && typeof node.props.onPress === 'function')[0].props.onPress());
  expect(onViewStatement).toHaveBeenCalledTimes(1);
  expect(deleteTransaction).not.toHaveBeenCalled();
});
