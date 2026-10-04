import { postJson } from './apiClient';

export function createCreditCard(values, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de adicionar um cartão.'); }
  return postJson('/api/credit-card', {
    financialInstitutionId: values.financialInstitutionId,
    description: values.description.trim(),
    creditLimit: values.creditLimit,
    closingDay: values.closingDay,
    dueDay: values.dueDay,
  }, accessToken, {
    headers: { access_token: accessToken },
    conflictMessage: 'Não foi possível cadastrar este cartão. Confira os dados.',
  });
}
