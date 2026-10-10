import { ApiError, authenticatedFetch } from './apiClient';

const invalid = () => new Error('A API retornou o resumo de crédito em formato inesperado.');
function number(value, integer = false) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === ''
      || !Number.isFinite(Number(value)) || Number(value) < 0
      || (integer && !Number.isInteger(Number(value)))) { throw invalid(); }
  return Number(value);
}
function list(value) {
  if (!Array.isArray(value)) { throw invalid(); }
  return value;
}
function card(value) {
  if (!value || typeof value.uuid !== 'string' || !value.uuid || typeof value.description !== 'string') { throw invalid(); }
  return value;
}
function date(value) {
  const day = typeof value === 'string' ? value.slice(0, 10) : '';
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(day + 'T00:00:00Z') : NaN;
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== day) { throw invalid(); }
  return value;
}

export function normalizeCreditDashboard(data) {
  if (!data) { throw invalid(); }
  const history = list(data.monthlyPurchases);
  if (history.length !== 6) { throw invalid(); }
  const monthlyPurchases = history.map((month, index) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month?.referenceMonth ?? '')) { throw invalid(); }
    if (index > 0) {
      const [year, monthNumber] = month.referenceMonth.split('-').map(Number);
      const [lastYear, lastMonth] = history[index - 1].referenceMonth.split('-').map(Number);
      if (year * 12 + monthNumber - (lastYear * 12 + lastMonth) !== 1) { throw invalid(); }
    }
    return { ...month, total: number(month.total), purchaseCount: number(month.purchaseCount, true) };
  });
  return {
    purchasesTotal: number(data.purchasesTotal), purchaseCount: number(data.purchaseCount, true),
    invoicesTotal: number(data.invoicesTotal), monthlyPurchases,
    expensesPerCategory: list(data.expensesPerCategory).map(category => {
      if (!category || typeof category.name !== 'string') { throw invalid(); }
      return { ...category, total: number(category.total) };
    }),
    upcomingInvoices: list(data.upcomingInvoices).map(invoice => {
      if (!invoice?.uuid || !['OPEN', 'CLOSED'].includes(invoice.status)) { throw invalid(); }
      return { ...invoice, total: number(invoice.total), dueDate: date(invoice.dueDate), creditCard: card(invoice.creditCard) };
    }),
    recentPurchases: list(data.recentPurchases).map(purchase => {
      if (!purchase?.uuid || typeof purchase.description !== 'string' || number(purchase.installmentCount, true) < 1) { throw invalid(); }
      return { ...purchase, amount: number(purchase.amount), installmentCount: Number(purchase.installmentCount),
        occurredAt: date(purchase.occurredAt), creditCard: card(purchase.creditCard) };
    }),
  };
}

export async function fetchCreditDashboard(year, month, creditCardUuid, accessToken, signal) {
  let endpoint = `/api/dashboard/credit?year=${year}&month=${month}`;
  if (creditCardUuid) { endpoint += `&creditCardUuid=${encodeURIComponent(creditCardUuid)}`; }
  const response = await authenticatedFetch(endpoint, {
    method: 'GET', headers: { Accept: 'application/json', access_token: accessToken }, signal,
  }, accessToken);
  if (!response.ok) { throw new ApiError('Não foi possível carregar seu crédito. Tente novamente.', response.status); }
  return normalizeCreditDashboard(await response.json());
}
