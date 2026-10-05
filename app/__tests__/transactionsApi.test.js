import { createTransaction, fetchTransactions, fetchTransactionDetails, fetchCreditCardPurchaseDetails } from '../src/services/transactions';
import { configureAuth } from '../src/services/apiClient';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
const originalFetch = global.fetch;

test('detalhes fazem GET com UUID na query e token; compra preserva todas as parcelas em ordem', async () => {
  const details = { uuid: 'transaction', description: 'Mercado', amount: '350.00', occurredAt: '2026-10-04T15:07:00' };
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => details }));
  expect(await fetchTransactionDetails('transaction', 'token')).toMatchObject({ uuid: 'transaction', amount: 350 });
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/transaction/details?uuid=transaction', expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ access_token: 'token', Authorization: 'Bearer token' }) }));
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ...details, uuid: 'purchase', creditCard: { uuid: 'card' }, installments: [2, 1].map(number => ({ uuid: `part-${number}`, installmentNumber: number, amount: '175.00', creditCardInvoiceUuid: `invoice-${number}`, referenceMonth: '2026-11', status: 'OPEN' })) }) });
  const purchase = await fetchCreditCardPurchaseDetails('purchase', 'token');
  expect(purchase.installments.map(item => item.installmentNumber)).toEqual([1, 2]);
  expect(global.fetch).toHaveBeenLastCalledWith('http://api.test/api/credit-card-purchase?uuid=purchase', expect.objectContaining({ method: 'GET' }));
  global.fetch.mockResolvedValue({ ok: false, status: 404 });
  await expect(fetchTransactionDetails('transaction', 'token')).rejects.toThrow('não encontrado');
});

test('extrato aceita pagamento de fatura como movimento da conta, sem parcelas', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ number: 0, last: true, content: [
    { uuid: 'payment', description: 'Pagamento da fatura novembro Inter', amount: '500.00', type: 'INVOICE_PAYMENT', paymentMethod: 'PIX', occurredAt: '2026-11-04T12:00:00', institutionName: 'Inter' },
  ] }) }));
  const result = await fetchTransactions('token');
  expect(result.rows[0]).toMatchObject({ id: 'payment', type: 'INVOICE_PAYMENT', amount: 500, payment: 'Pix', installmentCount: 1 });
});
afterEach(() => { global.fetch = originalFetch; });

test('GET consulta pagina do Slice com ambos os headers e converte os campos', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ number: 1, last: true, content: [
    { uuid: 'real-uuid', description: 'Mercado', amount: '350.00', type: 'EXPENSE', paymentMethod: 'CREDIT_CARD', occurredAt: '2026-10-03T15:07:03', categoryName: 'Mercado', categoryColor: 'ochre', categoryIcon: 'basket', institutionName: 'Mercado Pago', installmentNumber: 2, installmentCount: 3 },
  ] }) }));
  const result = await fetchTransactions('test-access', 1);
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/transaction?page=1&size=20', expect.objectContaining({
    method: 'GET', headers: expect.objectContaining({ access_token: 'test-access', Authorization: 'Bearer test-access' }),
  }));
  expect(result).toMatchObject({ page: 1, hasNext: false, rows: [{ id: 'real-uuid', amount: 350, payment: 'Crédito', date: '2026-10-03', category: 'Mercado', account: 'Mercado Pago', installmentNumber: 2, installmentCount: 3 }] });
});

test('GET rejeita resposta sem metadados de paginacao', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ content: [] }) }));
  await expect(fetchTransactions('test-access')).rejects.toThrow('paginação');
});

test('envia a transcrição revisada com access_token e aceita 201 sem body', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 201, json: async () => { throw new SyntaxError('Resposta vazia'); } }));
  await expect(createTransaction('  Gastei 45 no almoço.  ', 'test-access')).resolves.toBeUndefined();
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/transaction/create', expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ access_token: 'test-access', Authorization: 'Bearer test-access', 'Content-Type': 'application/json' }),
    body: JSON.stringify({ transcription: 'Gastei 45 no almoço.' }),
  }));
});

test('sem sessão ou transcrição não chama a API', async () => {
  global.fetch = jest.fn();
  await expect(createTransaction('Almoço', null)).rejects.toThrow('Entre na sua conta');
  await expect(createTransaction('   ', 'test-access')).rejects.toThrow('Revise a transcrição');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('renovação atualiza access_token e Authorization antes do envio', async () => {
  const disconnect = configureAuth(async () => 'new-access');
  global.fetch = jest.fn(async () => ({ ok: true, status: 201, json: async () => ({ uuid: 'saved' }) }));
  try {
    await createTransaction('Almoço', 'old-access');
    expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ access_token: 'new-access', Authorization: 'Bearer new-access' }),
    }));
  } finally { disconnect(); }
});
