import { ApiError, authenticatedFetch, patchJson, postJson, putJson } from './apiClient';

function initialAmount(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) { throw new Error('A API retornou o valor inicial do cartão em formato inesperado.'); }
  return amount;
}

export function distributeCreditCardInitialInvoices(uuid, invoices, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de distribuir as faturas.'); }
  return patchJson(`/api/credit-card/${encodeURIComponent(uuid)}/initial-invoices`, {
    invoices: invoices.map(invoice => ({ referenceMonth: invoice.referenceMonth, initialAmount: invoice.initialAmount,
      closingDate: invoice.closingDate, dueDate: invoice.dueDate })),
  }, accessToken, { headers: { access_token: accessToken } });
}

export function payCreditCardInvoice(uuid, values, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de pagar uma fatura.'); }
  return postJson(`/api/credit-card-invoice/${encodeURIComponent(uuid)}/pay`, {
    accountUuid: values.accountUuid, paymentMethod: values.paymentMethod, occurredAt: values.occurredAt,
  }, accessToken, { headers: { access_token: accessToken } });
}

export async function fetchCreditCardDetails(uuid, accessToken, signal) {
  const response = await authenticatedFetch(`/api/credit-card/${encodeURIComponent(uuid)}`, {
    method: 'GET', headers: { Accept: 'application/json', access_token: accessToken }, signal,
  }, accessToken);
  if (!response.ok) { throw new ApiError('Não foi possível carregar os detalhes do cartão. Tente novamente.', response.status); }
  const card = await response.json();
  if (card?.uuid !== uuid || !Array.isArray(card.invoices) || typeof card.description !== 'string'
      || card.creditLimit == null || !Number.isFinite(Number(card.creditLimit))
      || card.availableLimit == null || !Number.isFinite(Number(card.availableLimit))
      || card.invoices.some(invoice => typeof invoice.uuid !== 'string' || invoice.total == null || !Number.isFinite(Number(invoice.total))
        || !/^\d{4}-\d{2}$/.test(invoice.referenceMonth) || !/^\d{4}-\d{2}-\d{2}$/.test(invoice.closingDate)
        || !/^\d{4}-\d{2}-\d{2}$/.test(invoice.dueDate) || !['OPEN', 'CLOSED', 'PAID'].includes(invoice.status))) {
    throw new Error('A API retornou os detalhes do cartão em formato inesperado.');
  }
  const invoices = card.invoices.map(invoice => ({ ...invoice, total: Number(invoice.total), initialAmount: initialAmount(invoice.initialAmount) }));
  const unallocatedUsedLimit = initialAmount(card.unallocatedUsedLimit);
  const allocatedInitialAmount = initialAmount(card.allocatedInitialAmount ?? invoices.reduce((sum, invoice) => sum + invoice.initialAmount, 0));
  return { ...card, creditLimit: Number(card.creditLimit), availableLimit: Number(card.availableLimit),
    usedLimit: Number(card.usedLimit ?? Number(card.creditLimit) - Number(card.availableLimit)),
    unallocatedUsedLimit, allocatedInitialAmount,
    initialCommittedAmount: initialAmount(card.initialCommittedAmount ?? allocatedInitialAmount + unallocatedUsedLimit), invoices };
}

export async function fetchCreditCards(accessToken, signal) {
  const response = await authenticatedFetch('/api/credit-card', { method: 'GET', headers: { Accept: 'application/json', access_token: accessToken }, signal }, accessToken);
  if (!response.ok) { throw new ApiError('Não foi possível carregar seus cartões. Tente novamente.', response.status); }
  const data = await response.json();
  return normalizeCreditCards(data?.creditCards);
}

export function normalizeCreditCards(cards) {
  if (!Array.isArray(cards)) { throw new Error('A API retornou a lista de cartões em formato inesperado.'); }
  return cards.map(card => {
    const invoice = card?.currentInvoice;
    if (!card || typeof card.uuid !== 'string' || !card.uuid.trim() || typeof card.description !== 'string'
        || card.creditLimit == null || !Number.isFinite(Number(card.creditLimit))
        || card.availableLimit == null || !Number.isFinite(Number(card.availableLimit))
        || (invoice != null && (typeof invoice.uuid !== 'string' || invoice.total == null || !Number.isFinite(Number(invoice.total))
          || !/^\d{4}-\d{2}-\d{2}$/.test(invoice.dueDate) || !/^\d{4}-\d{2}-\d{2}$/.test(invoice.closingDate)))) {
      throw new Error('A API retornou os dados do cartão em formato inesperado.');
    }
    return { ...card, creditLimit: Number(card.creditLimit), availableLimit: Number(card.availableLimit),
      usedLimit: Number(card.usedLimit ?? Number(card.creditLimit) - Number(card.availableLimit)),
      unallocatedUsedLimit: initialAmount(card.unallocatedUsedLimit),
      currentInvoice: invoice ? { ...invoice, total: Number(invoice.total), initialAmount: initialAmount(invoice.initialAmount) } : null };
  });
}

export function createCreditCard(values, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de adicionar um cartão.'); }
  return postJson('/api/credit-card', {
    financialInstitutionId: values.financialInstitutionId,
    description: values.description.trim(),
    creditLimit: values.creditLimit,
    availableLimit: values.availableLimit,
    closingDay: values.closingDay,
    dueDay: values.dueDay,
  }, accessToken, {
    headers: { access_token: accessToken },
    conflictMessage: 'Não foi possível cadastrar este cartão. Confira os dados.',
  });
}

export function updateCreditCard(uuid, values, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de editar um cartão.'); }
  return putJson(`/api/credit-card/update/${encodeURIComponent(uuid)}`, {
    financialInstitutionId: values.financialInstitutionId, description: values.description.trim(),
    creditLimit: values.creditLimit, closingDay: values.closingDay, dueDay: values.dueDay,
  }, accessToken, { headers: { access_token: accessToken } });
}
