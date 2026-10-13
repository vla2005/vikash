import { loginUser, registerUser } from '../src/services/auth';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));

const originalFetch = global.fetch;
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); jest.restoreAllMocks(); });

test.each([loginUser, registerUser])('autenticação termina mesmo se fetch não reagir ao cancelamento', async authenticate => {
  global.fetch = jest.fn(() => new Promise(() => {}));
  const request = authenticate({ name: 'Viktor', email: 'viktor@example.com', password: 'Senha123!' });
  const result = request.catch(error => error);
  await jest.advanceTimersByTimeAsync(15000);
  expect((await result).message).toContain('A API não respondeu em 15 segundos');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});

test('login bem-sucedido libera o temporizador e mantém os dados da sessão', async () => {
  const session = { accessToken: 'test-access', user: { name: 'Viktor' } };
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => session }));
  await expect(loginUser({ email: 'viktor@example.com', password: 'Senha123!' })).resolves.toEqual(session);
  expect(jest.getTimerCount()).toBe(0);
});
