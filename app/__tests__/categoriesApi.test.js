import { createCategory, fetchCategories, updateCategory } from '../src/services/categories';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test('PUT update envia UUID na URL e campos alterados no body com token', async () => {
  const uuid = 'a446ab36-bd34-42db-a899-cb5ddab93f09';
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => { throw new Error('sem corpo'); } }));
  await updateCategory(uuid, { name: ' Pets ', icon: 'paw', color: 'blue' }, 'test-access');
  expect(global.fetch).toHaveBeenCalledWith(`http://api.test/api/category/update/${uuid}`, expect.objectContaining({
    method: 'PUT',
    headers: expect.objectContaining({ access_token: 'test-access', Authorization: 'Bearer test-access' }),
    body: JSON.stringify({ name: 'Pets', icon: 'paw', color: 'blue' }),
  }));
});

test('nao atualiza uma categoria sem UUID real retornado pelo servidor', async () => {
  global.fetch = jest.fn();
  await expect(updateCategory(undefined, { name: 'Pets' }, 'test-access')).rejects.toThrow('não tem UUID');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('GET consulta rota sem v1 e preserva as duas listas retornadas pelo servidor', async () => {
  const data = {
    defaultCategories: [{ name: 'Saúde', icon: 'health', color: 'sage' }],
    customCategories: [{ name: 'Pets', icon: 'paw', color: 'blue' }],
  };
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => data }));
  expect(await fetchCategories('test-access')).toEqual(data);
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/category', expect.objectContaining({
    method: 'GET', headers: expect.objectContaining({ access_token: 'test-access', Authorization: 'Bearer test-access' }),
  }));
});

test('POST usa rota sem v1, token nos headers e somente os campos solicitados', async () => {
  const category = { name: 'Pets', icon: 'paw', color: 'sage' };
  global.fetch = jest.fn(async () => ({ ok: true, status: 201, json: async () => { throw new SyntaxError('sem corpo'); } }));
  await expect(createCategory({ ...category, name: ' Pets ', id: 'ignored' }, 'test-access')).resolves.toBeUndefined();
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/category/create', expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ access_token: 'test-access', Authorization: 'Bearer test-access', 'Content-Type': 'application/json' }),
    body: JSON.stringify(category),
  }));
});

test('conflito apresenta mensagem de categoria e ausencia de sessao nao envia requisicao', async () => {
  global.fetch = jest.fn(async () => ({ ok: false, status: 409, json: async () => ({}) }));
  await expect(createCategory({ name: 'Pets', icon: 'paw', color: 'sage' }, 'test-access')).rejects.toThrow('Já existe uma categoria com esse nome.');
  global.fetch.mockClear();
  await expect(createCategory({ name: 'Pets' }, null)).rejects.toThrow('Entre na sua conta');
  expect(global.fetch).not.toHaveBeenCalled();
});
