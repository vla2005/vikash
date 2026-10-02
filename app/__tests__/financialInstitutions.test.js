import { fetchFinancialInstitutions } from '../src/services/financialInstitutions';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));

const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

test('consulta o endpoint informado e preserva IDs do banco ao ordenar nomes', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => [
    { id: 80, name: 'Santander', logoUrl: '/images/santander.webp' },
    { id: 42, name: 'Itaú', logoUrl: '/images/itau.webp' },
  ] });
  const institutions = await fetchFinancialInstitutions('/catalog');
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/catalog', expect.objectContaining({ method: 'GET' }));
  expect(institutions.map(item => item.id)).toEqual([42, 80]);
});

test('lista vazia da API permanece vazia', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => [] });
  await expect(fetchFinancialInstitutions('/catalog')).resolves.toEqual([]);
});

test('recusa resposta sem ID e nome utilizaveis', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => [{}] });
  await expect(fetchFinancialInstitutions('/catalog')).rejects.toThrow('formato inesperado');
});

test('retorno 401 explica que a API exige autenticacao', async () => {
  global.fetch.mockResolvedValue({ ok: false, status: 401 });
  await expect(fetchFinancialInstitutions('/catalog')).rejects.toThrow('autenticação');
});
