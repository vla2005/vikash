import { createCreditCard, fetchCreditCards, fetchCreditCardDetails, updateCreditCard, payCreditCardInvoice, distributeCreditCardInitialInvoices } from '../src/services/creditCards';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });
const values = { financialInstitutionId: 42, lastFourDigits: 32, creditLimit: 5000, closingDay: 3, dueDay: 10 };

test.each([null, 0, 32, 9999])('GET mantém cartões legados e finais válidos: %s', async lastFourDigits => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ creditCards: [{ uuid: 'card', lastFourDigits,
    creditLimit: 5000, availableLimit: 5000, currentInvoice: null }] }) });
  expect((await fetchCreditCards('token'))[0].lastFourDigits).toBe(lastFourDigits);
});

test.each([undefined, -1, 10000, 32.5, '0032'])('GET rejeita final inválido na resposta: %s', async lastFourDigits => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ creditCards: [{ uuid: 'card', lastFourDigits,
    creditLimit: 5000, availableLimit: 5000, currentInvoice: null }] }) });
  await expect(fetchCreditCards('token')).rejects.toThrow('formato inesperado');
});

test('POST inclui disponível zero e PATCH envia só os valores iniciais absolutos com token', async () => {
  global.fetch.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new SyntaxError('sem corpo'); } });
  await createCreditCard({ ...values, availableLimit: 0 }, 'token');
  expect(JSON.parse(global.fetch.mock.calls[0][1].body).availableLimit).toBe(0);
  const invoice = { uuid: 'ignored', referenceMonth: '2026-10', initialAmount: 800, closingDate: '2026-10-03', dueDate: '2026-10-10' };
  await expect(distributeCreditCardInitialInvoices('card', [invoice], 'token')).resolves.toBeNull();
  expect(global.fetch).toHaveBeenLastCalledWith('http://api.test/api/credit-card/card/initial-invoices', expect.objectContaining({
    method: 'PATCH', headers: expect.objectContaining({ access_token: 'token', Authorization: 'Bearer token' }),
    body: JSON.stringify({ invoices: [{ referenceMonth: '2026-10', initialAmount: 800, closingDate: '2026-10-03', dueDate: '2026-10-10' }] }),
  }));
  expect(() => distributeCreditCardInitialInvoices('card', [invoice], null)).toThrow('Entre na sua conta');
});

test('GET normaliza todos os valores iniciais sem perder parcelas ou faturas', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ uuid: 'card', lastFourDigits: 32, creditLimit: '5000', availableLimit: '2800',
    usedLimit: '2200', unallocatedUsedLimit: '1400', allocatedInitialAmount: '800', initialCommittedAmount: '2200',
    invoices: [{ uuid: 'invoice', referenceMonth: '2026-10', initialAmount: '800', total: '900', closingDate: '2026-10-03', dueDate: '2026-10-10', status: 'CLOSED' }] }) });
  expect(await fetchCreditCardDetails('card', 'token')).toMatchObject({ usedLimit: 2200, unallocatedUsedLimit: 1400,
    allocatedInitialAmount: 800, initialCommittedAmount: 2200, invoices: [{ initialAmount: 800, total: 900 }] });
});

test('pagamento envia UUID da conta e token; valor da fatura é calculado no servidor', async () => {
  global.fetch.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new SyntaxError('sem corpo'); } });
  const payment = { accountUuid: 'account', paymentMethod: 'PIX', occurredAt: '2026-10-05T12:00:00', amount: 1 };
  await expect(payCreditCardInvoice('invoice', payment, 'token')).resolves.toBeNull();
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/credit-card-invoice/invoice/pay', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ access_token: 'token', Authorization: 'Bearer token' }), body: JSON.stringify({ accountUuid: 'account', paymentMethod: 'PIX', occurredAt: '2026-10-05T12:00:00' }) }));
});

test('edicao usa PUT com UUID e token, enviando apenas os campos editaveis', async () => {
  global.fetch.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new SyntaxError('sem corpo'); } });
  await expect(updateCreditCard('card', values, 'token')).resolves.toBeNull();
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/credit-card/update/card', expect.objectContaining({ method: 'PUT', headers: expect.objectContaining({ access_token: 'token', Authorization: 'Bearer token' }), body: JSON.stringify({ ...values, lastFourDigits: values.lastFourDigits }) }));
});

test('POST envia apenas campos da request, com access_token e autorizacao', async () => {
  global.fetch.mockResolvedValue({ ok: true, status: 201, json: async () => { throw new SyntaxError('sem corpo'); } });
  await expect(createCreditCard(values, 'token')).resolves.toBeNull();
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/credit-card', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ access_token: 'token', Authorization: 'Bearer token', 'Content-Type': 'application/json' }), body: JSON.stringify({ ...values, lastFourDigits: 32 }) }));
});

test('propaga validacao do servidor e nao envia sem autenticacao', async () => {
  global.fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: 'Dados inválidos', fieldErrors: { dueDay: 'Informe um dia entre 1 e 31.' } }) });
  await expect(createCreditCard(values, 'token')).rejects.toMatchObject({ status: 400, fieldErrors: { dueDay: 'Informe um dia entre 1 e 31.' } });
  global.fetch.mockClear();
  expect(() => createCreditCard(values, null)).toThrow('Entre na sua conta');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('GET usa token e normaliza valores de cartao e fatura sem misturar saldo', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ creditCards: [{ uuid: 'card', lastFourDigits: 32, creditLimit: '5000.00', availableLimit: '4400.00', currentInvoice: { uuid: 'invoice', total: '600.00', closingDate: '2026-10-03', dueDate: '2026-10-10' } }] }) });
  const cards = await fetchCreditCards('token');
  expect(cards[0]).toMatchObject({ creditLimit: 5000, availableLimit: 4400, currentInvoice: { total: 600 } });
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/credit-card', expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ access_token: 'token' }) }));
});

test('cartao sem fatura usa null; resposta invalida e falha nao viram dados mockados', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ creditCards: [{ uuid: 'card', lastFourDigits: 32, creditLimit: 5000, availableLimit: 5000, currentInvoice: null }] }) });
  expect((await fetchCreditCards('token'))[0].currentInvoice).toBeNull();
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ creditCards: [{}] }) });
  await expect(fetchCreditCards('token')).rejects.toThrow('formato inesperado');
  global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
  await expect(fetchCreditCards('token')).rejects.toMatchObject({ status: 500 });
});
