import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import TransactionDetailsScreen from '../src/screens/TransactionDetailsScreen';
import CreditCardPurchaseDetailsScreen from '../src/screens/CreditCardPurchaseDetailsScreen';
import { fetchTransactionDetails, fetchCreditCardPurchaseDetails } from '../src/services/transactions';
jest.mock('../src/services/transactions', () => ({ fetchTransactionDetails: jest.fn(), fetchCreditCardPurchaseDetails: jest.fn() }));
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/components/CategoryIcon', () => 'CategoryIcon');
jest.mock('../src/components/InstitutionLogo', () => 'InstitutionLogo');
jest.mock('../src/components/BrandLogo', () => 'BrandLogo');
const transaction = { uuid: 'transaction', description: 'Mercado', amount: 350, type: 'EXPENSE', paymentMethod: 'PIX', occurredAt: '2026-10-04T15:07:00', category: { name: 'Mercado', color: 'ochre', icon: 'basket' }, account: { description: 'Mercado Pago' }, transcription: 'Gastei 350 no mercado' };
let renderer;
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const texts = () => renderer.root.findAllByType(Text).map(node => node.props.children).flat();
afterEach(async () => { await act(async () => renderer?.unmount()); jest.clearAllMocks(); });

test('transaction queries its UUID and shows real account, category and transcription', async () => {
  fetchTransactionDetails.mockResolvedValue(transaction);
  const back = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<TransactionDetailsScreen uuid="transaction" accessToken="token" onBack={back} />); });
  expect(fetchTransactionDetails).toHaveBeenCalledWith('transaction', 'token', expect.anything());
  expect(texts()).toEqual(expect.arrayContaining(['Mercado Pago', '15:07', 'Pix']));
  expect(texts()).not.toContain(transaction.transcription);
  expect(button('Ver transcrição original').props.accessibilityState.expanded).toBe(false);
  await act(async () => button('Ver transcrição original').props.onPress());
  expect(texts()).toContain(transaction.transcription);
  await act(async () => button('Ver transcrição original').props.onPress());
  expect(texts()).not.toContain(transaction.transcription);
  await act(async () => button('Voltar à lista').props.onPress());
  expect(back).toHaveBeenCalledTimes(1);
});

test('purchase opens invoice of selected installment and toggles original transcription', async () => {
  fetchCreditCardPurchaseDetails.mockResolvedValue({ ...transaction, uuid: 'purchase', amount: 1500, creditCard: { uuid: 'card', description: 'Meu cartão Itaú' }, installmentCount: 3,
    installments: [1, 2, 3].map(number => ({ uuid: `part-${number}`, installmentNumber: number, amount: 500, creditCardInvoiceUuid: `invoice-${number}`, referenceMonth: `2026-${number + 9}`, status: 'OPEN' })) });
  const onOpenInvoice = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<CreditCardPurchaseDetailsScreen uuid="purchase" accessToken="token" selectedInvoiceUuid="invoice-1" onOpenInvoice={onOpenInvoice} />); });
  expect(fetchCreditCardPurchaseDetails).toHaveBeenCalledWith('purchase', 'token', expect.anything());
  expect(texts()).toContain('Fatura selecionada');
  expect(texts()).not.toContain(transaction.transcription);
  await act(async () => button('Ver transcrição original').props.onPress());
  expect(texts()).toContain(transaction.transcription);
  await act(async () => button('Abrir fatura Novembro 2026').props.onPress());
  expect(onOpenInvoice).toHaveBeenCalledWith('card', 'invoice-2');
});

test('failed detail query offers retry without showing stale data', async () => {
  fetchTransactionDetails.mockRejectedValueOnce(new Error('Lançamento não encontrado.')).mockResolvedValueOnce(transaction);
  await act(async () => { renderer = TestRenderer.create(<TransactionDetailsScreen uuid="transaction" accessToken="token" />); });
  expect(texts()).toContain('Lançamento não encontrado.');
  const retry = renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityRole === 'button').find(node => node.props.accessibilityLabel !== 'Voltar à lista');
  await act(async () => retry.props.onPress());
  await act(async () => button('Ver transcrição original').props.onPress());
  expect(texts()).toContain(transaction.transcription);
});
