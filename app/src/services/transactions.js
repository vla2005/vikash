import { ApiError, authenticatedFetch, postJson } from './apiClient';

const paymentLabels = { PIX: 'Pix', CREDIT_CARD: 'Crédito', DEBIT_CARD: 'Débito', BANK_SLIP: 'Boleto', CASH: 'Dinheiro', BANK_TRANSFER: 'Transferência', OTHER: 'Outro' };
export async function fetchTransactions(accessToken, page = 0, signal) {
  if (!accessToken) { throw new Error('Entre na sua conta para consultar o extrato.'); }
  const response = await authenticatedFetch(`/api/transaction?page=${page}&size=20`, {
    method: 'GET', headers: { Accept: 'application/json', access_token: accessToken }, signal,
  }, accessToken);
  if (!response.ok) { throw new ApiError('Não foi possível carregar o extrato. Tente novamente.', response.status); }
  const data = await response.json();
  if (!Array.isArray(data?.content) || typeof data.last !== 'boolean' || data.number !== page) {
    throw new Error('A API retornou a paginação do extrato em formato inesperado.');
  }
  const rows = data.content.map(item => {
    if (typeof item.uuid !== 'string' || typeof item.description !== 'string' || item.amount == null
        || !Number.isFinite(Number(item.amount)) || typeof item.occurredAt !== 'string'
        || !/^\d{4}-\d{2}-\d{2}T/.test(item.occurredAt) || !['INCOME', 'EXPENSE', 'TRANSFER'].includes(item.type)) {
      throw new Error('A API retornou uma transação em formato inesperado.');
    }
    return { id: item.uuid, description: item.description, amount: Number(item.amount), type: item.type,
      date: item.occurredAt.slice(0, 10), occurredAt: item.occurredAt, category: item.categoryName,
      color: item.categoryColor, icon: item.categoryIcon, account: item.institutionName,
      payment: paymentLabels[item.paymentMethod] || 'Outro' };
  });
  return { rows, page: data.number, hasNext: !data.last };
}

export async function createTransaction(transcription, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de registrar uma transação.'); }
  if (typeof transcription !== 'string' || !transcription.trim()) {
    throw new Error('Revise a transcrição antes de enviar.');
  }
  return postJson('/api/transaction/create', {
    transcription: transcription.trim(),
  }, accessToken, { headers: { access_token: accessToken } });
}
