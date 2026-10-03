import { createTransaction } from '../src/services/transactions';
import { configureAuth } from '../src/services/apiClient';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test('envia somente a transcrição revisada por POST com access_token e retorna a transação', async () => {
  const transaction = { uuid: 'transaction-uuid', description: 'Almoço', amount: 45 };
  global.fetch = jest.fn(async () => ({ ok: true, status: 201, json: async () => transaction }));
  expect(await createTransaction('  Gastei 45 no almoço.  ', 'test-access')).toEqual(transaction);
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
