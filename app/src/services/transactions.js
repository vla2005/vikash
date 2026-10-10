import { ApiError, authenticatedFetch, deleteJson, postJson, putJson } from './apiClient';

export function updateTransaction(uuid, values, accessToken, purchase = false) {
  if (!accessToken) { throw new Error('Entre na sua conta para editar o lançamento.'); }
  if (!uuid) { throw new Error('O lançamento não tem UUID. Atualize a lista.'); }
  const endpoint = purchase ? '/api/credit-card-purchase' : '/api/transaction';
  return putJson(`${endpoint}/${encodeURIComponent(uuid)}`, values, accessToken, {
    headers: { access_token: accessToken }, conflictMessage: 'O lançamento mudou. Atualize a tela e tente novamente.',
  });
}

export function deleteTransaction(uuid, accessToken) {
  return deleteEntry('/api/transaction', uuid, accessToken);
}

export function deleteCreditCardPurchase(uuid, accessToken) {
  return deleteEntry('/api/credit-card-purchase', uuid, accessToken);
}

function deleteEntry(endpoint, uuid, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta para excluir o lançamento.'); }
  if (!uuid) { throw new Error('O lançamento não tem UUID. Atualize a lista.'); }
  return deleteJson(`${endpoint}/${encodeURIComponent(uuid)}`, accessToken, {
    headers: { access_token: accessToken }, conflictMessage: 'Não foi possível excluir este lançamento. Atualize a lista e tente novamente.',
  });
}

const paymentLabels = { PIX: 'Pix', CREDIT_CARD: 'Crédito', DEBIT_CARD: 'Débito', BANK_SLIP: 'Boleto', CASH: 'Dinheiro', BANK_TRANSFER: 'Transferência', OTHER: 'Outro' };
export function normalizeTransactionSummaries(items) {
  if (!Array.isArray(items)) { throw new Error('A API retornou a lista de transações em formato inesperado.'); }
  return items.map(item => {
    if (typeof item?.uuid !== 'string' || !item.uuid.trim() || typeof item.description !== 'string' || item.amount == null
        || !['number', 'string'].includes(typeof item.amount) || String(item.amount).trim() === ''
        || !Number.isFinite(Number(item.amount)) || typeof item.occurredAt !== 'string'
        || !/^\d{4}-\d{2}-\d{2}T/.test(item.occurredAt) || !['INCOME', 'EXPENSE', 'TRANSFER', 'INVOICE_PAYMENT'].includes(item.type)) {
      throw new Error('A API retornou uma transação em formato inesperado.');
    }
    return { id: item.uuid, description: item.description, amount: Number(item.amount), type: item.type,
      date: item.occurredAt.slice(0, 10), occurredAt: item.occurredAt, category: item.categoryName,
      color: item.categoryColor, icon: item.categoryIcon, account: item.institutionName,
      purchaseUuid: item.purchaseUuid ?? null,
      installmentNumber: item.installmentNumber ?? 1, installmentCount: item.installmentCount ?? 1,
      payment: paymentLabels[item.paymentMethod] || 'Outro' };
  });
}
export async function fetchTransactions(accessToken, page = 0, signal, endpoint = '/api/transaction') {
  if (!accessToken) { throw new Error('Entre na sua conta para consultar o extrato.'); }
  const response = await authenticatedFetch(`${endpoint}?page=${page}&size=20`, {
    method: 'GET', headers: { Accept: 'application/json', access_token: accessToken }, signal,
  }, accessToken);
  if (!response.ok) { throw new ApiError('Não foi possível carregar o extrato. Tente novamente.', response.status); }
  const data = await response.json();
  if (!Array.isArray(data?.content) || typeof data.last !== 'boolean' || data.number !== page) {
    throw new Error('A API retornou a paginação do extrato em formato inesperado.');
  }
  const rows = normalizeTransactionSummaries(data.content);
  return { rows, page: data.number, hasNext: !data.last };
}

export async function createTransaction(transcription, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de registrar uma transação.'); }
  if (typeof transcription !== 'string' || !transcription.trim()) {
    throw new Error('Revise a transcrição antes de enviar.');
  }
  await postJson('/api/transaction/create', {
    transcription: transcription.trim(),
  }, accessToken, { headers: { access_token: accessToken } });
}

export async function fetchTransactionDetails(uuid, accessToken, signal) {
  return fetchDetails(`/api/transaction/details?uuid=${encodeURIComponent(uuid)}`, uuid, accessToken, signal, false);
}

export async function fetchCreditCardPurchaseDetails(uuid, accessToken, signal) {
  return fetchDetails(`/api/credit-card-purchase?uuid=${encodeURIComponent(uuid)}`, uuid, accessToken, signal, true);
}

async function fetchDetails(path, uuid, accessToken, signal, purchase) {
  if (!accessToken) { throw new Error('Entre na sua conta para consultar os detalhes.'); }
  if (!uuid) { throw new Error('O lançamento não tem UUID. Atualize a lista.'); }
  const response = await authenticatedFetch(path, {
    method: 'GET', headers: { Accept: 'application/json', access_token: accessToken }, signal,
  }, accessToken);
  if (!response.ok) {
    throw new ApiError(response.status === 404 ? 'Lançamento não encontrado.' : 'Não foi possível carregar os detalhes. Tente novamente.', response.status);
  }
  const data = await response.json();
  if (data?.uuid !== uuid || typeof data.description !== 'string' || data.amount == null
      || !Number.isFinite(Number(data.amount)) || typeof data.occurredAt !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T/.test(data.occurredAt)
      || (purchase && (!data.creditCard || !Array.isArray(data.installments)))) {
    throw new Error('A API retornou os detalhes em formato inesperado.');
  }
  if (purchase && data.installments.some(item => !item.uuid || !item.creditCardInvoiceUuid
      || !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.referenceMonth)
      || !Number.isFinite(Number(item.amount)) || !Number.isInteger(item.installmentNumber)
      || !['OPEN', 'CLOSED', 'PAID'].includes(item.status))) {
    throw new Error('A API retornou as parcelas em formato inesperado.');
  }
  return { ...data, amount: Number(data.amount), ...(purchase ? {
    installments: data.installments.map(item => ({ ...item, amount: Number(item.amount) }))
      .sort((first, second) => first.installmentNumber - second.installmentNumber),
  } : {}) };
}
