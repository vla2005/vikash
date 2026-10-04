import { createCreditCard } from '../src/services/creditCards';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });
const values = { financialInstitutionId: 42, description: ' Meu cartão Inter ', creditLimit: 5000, closingDay: 3, dueDay: 10 };

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
