import { verifyRegistrationEmail } from '../src/services/auth';
import { configureAuth } from '../src/services/apiClient';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
const token = '11111111-1111-4111-8111-111111111111.' + 'A'.repeat(43);
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn(async () => ({ ok: true, status: 204, json: async () => { throw new Error('No body'); } })); });
afterEach(() => { global.fetch = originalFetch; });

test('verifica por POST público sem colocar token na URL ou enviar credenciais da conta ativa', async () => {
  const resolver = jest.fn(); const disconnect = configureAuth(resolver);
  try {
    await verifyRegistrationEmail(token);
    expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/auth/register/verify-link', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ token }),
    }));
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined(); expect(resolver).not.toHaveBeenCalled();
  } finally { disconnect(); }
});
test('duas montagens concorrentes compartilham a mesma verificação de uso único', async () => {
  let finish;
  global.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const first = verifyRegistrationEmail(token); const second = verifyRegistrationEmail(token);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  finish({ ok: true, status: 204, json: async () => { throw new Error('No body'); } });
  await Promise.all([first, second]);
});
test('prova malformada é rejeitada localmente sem chamar a API', async () => {
  await expect(verifyRegistrationEmail('invalid')).rejects.toMatchObject({ status: 400 });
  expect(global.fetch).not.toHaveBeenCalled();
});
