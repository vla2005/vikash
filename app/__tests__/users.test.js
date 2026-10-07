import { updatePassword, updateUser } from '../src/services/users';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));

const originalFetch = global.fetch;
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

test('atualiza perfil com PUT, nome/email normalizados e token nos headers', async () => {
  const user = { uuid: 'user-uuid', name: 'Lívia Silva', email: 'livia@example.com' };
  global.fetch.mockResolvedValue(response(user));
  expect(await updateUser({ name: ' Lívia Silva ', email: ' LIVIA@example.com ' }, 'token')).toEqual(user);
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/user/update', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ name: 'Lívia Silva', email: 'livia@example.com' }),
    headers: expect.objectContaining({ Authorization: 'Bearer token', access_token: 'token' }),
  }));
});

test('conflito de email sem fieldErrors é associado ao input de email', async () => {
  global.fetch.mockResolvedValue(response({ message: 'Este email já está sendo utilizado', fieldErrors: null }, 409));
  await expect(updateUser({ name: 'Lívia', email: 'livia@example.com' }, 'token')).rejects.toMatchObject({
    status: 409, fieldErrors: { email: 'Este e-mail já está sendo utilizado.' },
  });
});

test('mantém as mensagens específicas de validação retornadas pela API', async () => {
  const fieldErrors = { name: 'Informe o nome completo.', email: 'Informe um e-mail válido.' };
  global.fetch.mockResolvedValue(response({ fieldErrors }, 400));
  await expect(updateUser({ name: 'Lívia', email: 'livia@example.com' }, 'token'))
    .rejects.toMatchObject({ status: 400, fieldErrors });
});

test('não envia atualização sem autenticação', async () => {
  await expect(updateUser({ name: 'Lívia', email: 'livia@example.com' })).rejects.toMatchObject({ status: 401 });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('troca de senha usa PATCH autenticado, preserva os caracteres e aceita resposta 204 sem body', async () => {
  global.fetch.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('No content'); } });
  await updatePassword({ password: ' senha antiga ', newPassword: ' Nova12345! ', confirmPassword: 'não enviar' }, 'token');
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/user/update-password', expect.objectContaining({
    method: 'PATCH', body: JSON.stringify({ password: ' senha antiga ', newPassword: ' Nova12345! ' }),
    headers: expect.objectContaining({ Authorization: 'Bearer token', access_token: 'token' }),
  }));
});

test.each(['Ab1!', 'abcdef1!', 'Abcdefg!', 'Abcdefg1'])('service de senha também bloqueia senha inválida %s', async newPassword => {
  await expect(updatePassword({ password: 'old123', newPassword }, 'token'))
    .rejects.toMatchObject({ status: 400, fieldErrors: { newPassword: expect.any(String) } });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('troca de senha não envia request sem token', async () => {
  await expect(updatePassword({ password: 'old123', newPassword: 'Nova12345!' })).rejects.toMatchObject({ status: 401 });
  expect(global.fetch).not.toHaveBeenCalled();
});
