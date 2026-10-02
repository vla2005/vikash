import { postJson } from './apiClient';

export async function createAccount(values, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de adicionar uma conta financeira.'); }
  const account = await postJson('/api/v1/account/create', {
    description: values.name.trim(),
    type: values.type,
    balance: values.balance,
    financialInstitutionId: values.type === 'CARTEIRA' ? null : values.financialInstitutionId ?? null,
  }, accessToken);
  if (!Number.isSafeInteger(account?.id) || typeof account.description !== 'string' || !Number.isFinite(Number(account.balance))) {
    throw new Error('A API não retornou os dados da conta criada.');
  }
  return { id: account.id, name: account.description, type: account.type, balance: Number(account.balance),
    financialInstitutionId: account.financialInstitution?.id ?? null, financialInstitution: account.financialInstitution ?? null };
}
