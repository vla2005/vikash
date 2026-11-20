import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import InvoicePaymentDrawer from '../src/components/InvoicePaymentDrawer';
import { payCreditCardInvoice, registerExternalInvoicePayment } from '../src/services/creditCards';

const mockToast = jest.fn();
jest.mock('../src/hooks/useToast', () => () => ({ showToast: mockToast }));
const mockAccounts = jest.fn();
jest.mock('../src/hooks/useAccounts', () => (...args) => mockAccounts(...args));
jest.mock('../src/services/creditCards', () => ({ payCreditCardInvoice: jest.fn(), registerExternalInvoicePayment: jest.fn() }));
jest.mock('../src/components/InstitutionLogo', () => () => null);
let renderer;
let paid;
function button(label) { return renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]; }
beforeEach(() => {
  jest.clearAllMocks();
  paid = jest.fn();
  mockAccounts.mockReturnValue({ accounts: [{ uuid: 'account', description: 'Inter', balance: 2000 }], loading: false, error: '', retry: jest.fn() });
});
afterEach(async () => { await act(async () => renderer?.unmount()); });
async function open() {
  await act(async () => { renderer = TestRenderer.create(<InvoicePaymentDrawer invoice={{ uuid: 'invoice', total: 500 }} accessToken="token" onClose={() => {}} onPaid={paid} />); });
}
test('registra pagamento por outra pessoa mesmo quando a consulta de contas falha', async () => {
  mockAccounts.mockReturnValue({ accounts: [], loading: false, error: 'Contas indisponíveis' });
  registerExternalInvoicePayment.mockResolvedValue(null);
  await open();
  await act(async () => button('Paga por outra pessoa').props.onPress());
  expect(button('Paga por outra pessoa').props.accessibilityState.checked).toBe(true);
  expect(button('Paga por outra pessoa').props['aria-checked']).toBe(true);
  expect(button('Confirmar pagamento da fatura').props.disabled).toBe(false);
  await act(async () => button('Confirmar pagamento da fatura').props.onPress());
  expect(registerExternalInvoicePayment).toHaveBeenCalledWith('invoice', expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), 'token');
  expect(payCreditCardInvoice).not.toHaveBeenCalled();
  expect(paid).toHaveBeenCalledTimes(1);
});
test('exige uma conta, envia pagamento uma vez e atualiza somente depois do sucesso', async () => {
  let resolve;
  payCreditCardInvoice.mockImplementation(() => new Promise(done => { resolve = done; }));
  await open();
  expect(button('Confirmar pagamento da fatura').props.disabled).toBe(true);
  await act(async () => button('Pagar com Inter').props.onPress());
  await act(async () => { button('Confirmar pagamento da fatura').props.onPress(); button('Confirmar pagamento da fatura').props.onPress(); });
  expect(payCreditCardInvoice).toHaveBeenCalledTimes(1);
  expect(payCreditCardInvoice).toHaveBeenCalledWith('invoice', { accountUuid: 'account', paymentMethod: 'PIX', occurredAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) }, 'token');
  expect(paid).not.toHaveBeenCalled();
  await act(async () => resolve({ status: 'PAID' }));
  expect(paid).toHaveBeenCalledTimes(1);
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
});
test('falha mantém a seleção e permite tentar novamente', async () => {
  payCreditCardInvoice.mockRejectedValueOnce(new Error('Saldo insuficiente'));
  await open();
  await act(async () => button('Pagar com Inter').props.onPress());
  await act(async () => button('Confirmar pagamento da fatura').props.onPress());
  expect(paid).not.toHaveBeenCalled();
  expect(mockToast).toHaveBeenCalledWith({ type: 'error', message: 'Saldo insuficiente' });
  expect(button('Confirmar pagamento da fatura').props.disabled).toBe(false);
  payCreditCardInvoice.mockResolvedValueOnce({ status: 'PAID' });
  await act(async () => button('Confirmar pagamento da fatura').props.onPress());
  expect(paid).toHaveBeenCalledTimes(1);
});

test('envia a data escolhida e bloqueia uma data invalida antes de chamar a API', async () => {
  payCreditCardInvoice.mockResolvedValue({ status: 'PAID' });
  await open();
  await act(async () => button('Pagar com Inter').props.onPress());
  const input = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onChangeText === 'function')[0];
  await act(async () => { input('Data do pagamento').props.onChangeText('31022026'); input('Horário do pagamento').props.onChangeText('1900'); });
  await act(async () => button('Confirmar pagamento da fatura').props.onPress());
  expect(payCreditCardInvoice).not.toHaveBeenCalled();
  await act(async () => input('Data do pagamento').props.onChangeText('04102026'));
  await act(async () => button('Confirmar pagamento da fatura').props.onPress());
  expect(payCreditCardInvoice).toHaveBeenCalledWith('invoice', { accountUuid: 'account', paymentMethod: 'PIX', occurredAt: '2026-10-04T19:00:00' }, 'token');
});
