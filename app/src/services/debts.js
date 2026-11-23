import { ApiError, authenticatedFetch, postJson, putJson } from './apiClient';

function normalizeDebt(debt) {
  const { uuid, creditor, description, totalAmount, installmentCount, paidInstallments, installments, version } = debt ?? {};
  if (typeof uuid !== 'string' || !uuid || typeof creditor !== 'string' || !creditor ||
      (description != null && typeof description !== 'string') ||
      (version != null && (!Number.isSafeInteger(version) || version < 0)) ||
      totalAmount == null || !Number.isFinite(Number(totalAmount)) || Number(totalAmount) <= 0 ||
      !Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 120 ||
      !Number.isInteger(paidInstallments) || paidInstallments < 0 || paidInstallments > installmentCount ||
      !Array.isArray(installments) || installments.length !== installmentCount - paidInstallments ||
      installments.some((item, index) => item?.number !== paidInstallments + index + 1 ||
        item.amount == null || !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0 ||
        typeof item.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate))) {
    throw new Error('A API retornou os dados da dívida em formato inesperado.');
  }
  return { ...debt, totalAmount: Number(totalAmount),
    installments: installments.map(item => ({ ...item, amount: Number(item.amount) })) };
}

export async function fetchDebts(accessToken, signal) {
  const response = await authenticatedFetch('/api/debt', { headers: { Accept: 'application/json' }, signal }, accessToken);
  if (!response.ok) { throw new ApiError('Não foi possível carregar suas dívidas.', response.status); }
  const data = await response.json();
  if (!Array.isArray(data?.debts)) { throw new Error('A API retornou a lista de dívidas em formato inesperado.'); }
  return data.debts.map(normalizeDebt);
}

export function createDebt(values, accessToken) {
  return postJson('/api/debt/create', values, accessToken, {
    conflictMessage: 'Esta dívida já foi cadastrada. Volte à lista para conferir os dados salvos.',
  });
}

export function updateDebt(uuid, values, accessToken) {
  return putJson(`/api/debt/update/${encodeURIComponent(uuid)}`, values, accessToken, {
    conflictMessage: 'Esta dívida mudou. Volte à lista e abra a edição novamente.',
  });
}

export function payDebtInstallment(uuid, number, payment, accessToken) {
  return putJson(`/api/debt/${encodeURIComponent(uuid)}/installments/${number}/payment`, payment, accessToken, {
    conflictMessage: 'Esta parcela mudou. Feche a confirmação e confira os dados da dívida.',
  });
}
