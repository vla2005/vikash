import { ApiError, authenticatedFetch, postJson, putJson } from './apiClient';

function normalizeAccount(account) {
  if (typeof account?.uuid !== 'string' || !account.uuid.trim() || typeof account.description !== 'string'
      || typeof account.type !== 'string' || account.balance == null || !Number.isFinite(Number(account.balance))) {
    throw new Error('A API retornou os dados da conta em formato inesperado.');
  }
  return { uuid: account.uuid, description: account.description, name: account.description, type: account.type, balance: Number(account.balance),
    financialInstitutionId: account.financialInstitution?.id ?? null, financialInstitution: account.financialInstitution ?? null };
}

export async function fetchAccounts(accessToken, signal) {
  const response = await authenticatedFetch('/api/account', { method: 'GET', headers: { Accept: 'application/json' }, signal }, accessToken);
  if (!response.ok) { throw new ApiError('Não foi possível carregar suas contas. Tente novamente.', response.status); }
  const data = await response.json();
  if (!Array.isArray(data?.accounts)) { throw new Error('A API retornou a lista de contas em formato inesperado.'); }
  return data.accounts.map(normalizeAccount);
}

export async function createAccount(values, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de adicionar uma conta financeira.'); }
  const account = await postJson('/api/account/create', {
    description: values.name.trim(),
    type: values.type,
    balance: values.balance,
    financialInstitutionId: values.type === 'CARTEIRA' ? null : values.financialInstitutionId ?? null,
  }, accessToken);
  return normalizeAccount(account);
}

export async function updateAccount(uuid, values, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de editar uma conta financeira.'); }
  if (typeof uuid !== 'string' || !uuid.trim()) { throw new Error('A conta não tem UUID. Atualize a listagem antes de editar.'); }
  const account = await putJson(`/api/account/update/${encodeURIComponent(uuid)}`, {
    description: values.name.trim(),
    type: values.type,
    balance: values.balance,
    financialInstitutionId: values.type === 'CARTEIRA' ? null : values.financialInstitutionId ?? null,
  }, accessToken);
  return account == null ? null : normalizeAccount(account);
}
