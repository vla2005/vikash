import { createCreditCard, fetchCreditCards, updateCreditCard, payCreditCardInvoice } from '../src/services/creditCards';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });
const values = { financialInstitutionId: 42, description: ' Meu cartão Inter ', creditLimit: 5000, closingDay: 3, dueDay: 10 };

test('pagamento envia UUID da conta e token; valor da fatura é calculado no servidor', async () => {
  global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'PAID' }) });
  const payment = { accountUuid: 'account', paymentMethod: 'PIX', occurredAt: '2026-10-05T12:00:00', amount: 1 };
  await payCreditCardInvoice('invoice', payment, 'token');
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/credit-card-invoice/invoice/pay', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ access_token: 'token', Authorization: 'Bearer token' }), body: JSON.stringify({ accountUuid: 'account', paymentMethod: 'PIX', occurredAt: '2026-10-05T12:00:00' }) }));
});

test('edicao usa PUT com UUID e token, enviando apenas os campos editaveis', async () => {
  global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ uuid: 'card', ...values }) });
  await updateCreditCard('card', values, 'token');
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/credit-card/update/card', expect.objectContaining({ method: 'PUT', headers: expect.objectContaining({ access_token: 'token', Authorization: 'Bearer token' }), body: JSON.stringify({ ...values, description: values.description.trim() }) }));
});

test('POST envia apenas campos da request, com access_token e autorizacao', async () => {
  const card = { uuid: 'saved', ...values };
  global.fetch.mockResolvedValue({ ok: true, status: 201, json: async () => card });
  expect(await createCreditCard(values, 'token')).toEqual(card);
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/credit-card', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ access_token: 'token', Authorization: 'Bearer token', 'Content-Type': 'application/json' }), body: JSON.stringify({ ...values, description: 'Meu cartão Inter' }) }));
});

test('propaga validacao do servidor e nao envia sem autenticacao', async () => {
  global.fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: 'Dados inválidos', fieldErrors: { dueDay: 'Informe um dia entre 1 e 31.' } }) });
  await expect(createCreditCard(values, 'token')).rejects.toMatchObject({ status: 400, fieldErrors: { dueDay: 'Informe um dia entre 1 e 31.' } });
  global.fetch.mockClear();
  expect(() => createCreditCard(values, null)).toThrow('Entre na sua conta');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('GET usa token e normaliza valores de cartao e fatura sem misturar saldo', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ creditCards: [{ uuid: 'card', description: 'Inter', creditLimit: '5000.00', availableLimit: '4400.00', currentInvoice: { uuid: 'invoice', total: '600.00', closingDate: '2026-10-03', dueDate: '2026-10-10' } }] }) });
  const cards = await fetchCreditCards('token');
  expect(cards[0]).toMatchObject({ creditLimit: 5000, availableLimit: 4400, currentInvoice: { total: 600 } });
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/credit-card', expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ access_token: 'token' }) }));
});

test('cartao sem fatura usa null; resposta invalida e falha nao viram dados mockados', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ creditCards: [{ uuid: 'card', description: 'Inter', creditLimit: 5000, availableLimit: 5000, currentInvoice: null }] }) });
  expect((await fetchCreditCards('token'))[0].currentInvoice).toBeNull();
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ creditCards: [{}] }) });
  await expect(fetchCreditCards('token')).rejects.toThrow('formato inesperado');
  global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
  await expect(fetchCreditCards('token')).rejects.toMatchObject({ status: 500 });
});
