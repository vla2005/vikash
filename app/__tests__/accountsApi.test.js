import { createAccount, fetchAccounts, updateAccount } from '../src/services/accounts';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
const originalFetch = global.fetch;
const account = { uuid: 'f5699fe5-e5ba-48b2-b608-6e204a769af7', description: 'Dinheiro', type: 'CARTEIRA', balance: '35.50', financialInstitution: null };
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });
const response = data => ({ ok: true, status: 200, json: async () => data });

test('GET autenticado usa /api/account e normaliza saldo e UUID sem instituicao na carteira', async () => {
  global.fetch.mockResolvedValue(response({ accounts: [account] }));
  expect(await fetchAccounts('token')).toEqual([expect.objectContaining({ uuid: account.uuid, description: 'Dinheiro', balance: 35.5, financialInstitution: null })]);
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/account', expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer token' }) }));
});

test('criacao aceita o DTO com UUID e preserva a instituicao retornada', async () => {
  const institution = { id: 7, name: 'Itaú', logoUrl: '/images/financial-institutions/itau.webp' };
  global.fetch.mockResolvedValue(response({ ...account, type: 'CONTA_CORRENTE', description: 'Itaú', financialInstitution: institution }));
  const result = await createAccount({ name: 'Itaú', type: 'CONTA_CORRENTE', balance: 35.5, financialInstitutionId: 7 }, 'token');
  expect(result).toMatchObject({ uuid: account.uuid, name: 'Itaú', financialInstitution: institution });
});

test.each([{}, { accounts: null }, { accounts: [{ ...account, uuid: undefined }] }, { accounts: [{ ...account, balance: null }] }])('rejeita resposta invalida sem inventar contas', async data => {
  global.fetch.mockResolvedValue(response(data));
  await expect(fetchAccounts('token')).rejects.toThrow('formato inesperado');
});

test('lista vazia e erro do servidor nao viram contas locais', async () => {
  global.fetch.mockResolvedValueOnce(response({ accounts: [] }));
  expect(await fetchAccounts('token')).toEqual([]);
  global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
  await expect(fetchAccounts('token')).rejects.toMatchObject({ status: 500 });
});

test('PUT inclui UUID na URL e campos completos no body; carteira envia instituicao null', async () => {
  global.fetch.mockResolvedValue(response(account));
  const result = await updateAccount(account.uuid, { name: ' Dinheiro ', type: 'CARTEIRA', balance: 35.5, financialInstitutionId: 7 }, 'token');
  expect(result.uuid).toBe(account.uuid);
  expect(global.fetch).toHaveBeenCalledWith(`http://api.test/api/account/update/${account.uuid}`, expect.objectContaining({ method: 'PUT', headers: expect.objectContaining({ Authorization: 'Bearer token' }), body: JSON.stringify({ description: 'Dinheiro', type: 'CARTEIRA', balance: 35.5, financialInstitutionId: null }) }));
});

test('PUT aceita 204 e rejeita UUID ausente antes de enviar', async () => {
  global.fetch.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new SyntaxError('No body'); } });
  expect(await updateAccount(account.uuid, { name: 'Dinheiro', type: 'CARTEIRA', balance: 0 }, 'token')).toBeNull();
  global.fetch.mockClear();
  await expect(updateAccount(null, {}, 'token')).rejects.toThrow('UUID');
  expect(global.fetch).not.toHaveBeenCalled();
});
