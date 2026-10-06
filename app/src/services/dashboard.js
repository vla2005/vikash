import { ApiError, authenticatedFetch } from './apiClient';
import { normalizeCreditCards } from './creditCards';
import { normalizeAccounts } from './accounts';
import { normalizeTransactionSummaries } from './transactions';

export async function fetchDashboard(year, month, accessToken, signal) {
  const response = await authenticatedFetch(`/api/dashboard?year=${year}&month=${month}`, {
    method: 'GET', headers: { Accept: 'application/json', access_token: accessToken }, signal,
  }, accessToken);
  if (!response.ok) { throw new ApiError('Não foi possível carregar o resumo. Tente novamente.', response.status); }
  const data = await response.json();
  const fields = ['totalBalance', 'incomes', 'expenses'];
  if (fields.some(field => data?.[field] == null || !['number', 'string'].includes(typeof data[field])
      || String(data[field]).trim() === '' || !Number.isFinite(Number(data[field])))) {
    throw new Error('A API retornou o resumo em formato inesperado.');
  }
  const result = Object.fromEntries(fields.map(field => [field, Number(data[field])]));
  for (const field of ['incomesPercentageChange', 'expensesPercentageChange']) {
    const value = data[field];
    if (value != null && (!['number', 'string'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value)))) {
      throw new Error('A API retornou o comparativo em formato inesperado.');
    }
    result[field] = value == null ? null : Number(value);
  }
  const points = data.balanceEvolution ?? [];
  if (!Array.isArray(points) || (points.length !== 0 && points.length !== 7)) {
    throw new Error('A API retornou a evolução do saldo em formato inesperado.');
  }
  result.balanceEvolution = points.map((point, index) => {
    const timestamp = typeof point?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(point.date) ? Date.parse(`${point.date}T00:00:00Z`) : NaN;
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== point.date
        || (index > 0 && timestamp - Date.parse(`${points[index - 1].date}T00:00:00Z`) !== 86400000)
        || point.balance == null || !['number', 'string'].includes(typeof point.balance)
        || String(point.balance).trim() === '' || !Number.isFinite(Number(point.balance))) {
      throw new Error('A API retornou a evolução do saldo em formato inesperado.');
    }
    return { date: point.date, balance: Number(point.balance) };
  });
  result.creditCards = normalizeCreditCards(data.creditCards == null ? []
    : Array.isArray(data.creditCards) ? data.creditCards : data.creditCards.creditCards);
  result.accounts = normalizeAccounts(data.accounts == null ? []
    : Array.isArray(data.accounts) ? data.accounts : data.accounts.accounts);
  result.recentTransactions = normalizeTransactionSummaries(data.recentTransactions ?? []);
  const categories = data.expensesPerCategory ?? [];
  if (!Array.isArray(categories)) { throw new Error('A API retornou os gastos por categoria em formato inesperado.'); }
  result.expensesPerCategory = categories.map(category => {
    if (!category || category.total == null || !['number', 'string'].includes(typeof category.total)
        || String(category.total).trim() === '' || !Number.isFinite(Number(category.total)) || Number(category.total) < 0) {
      throw new Error('A API retornou os gastos por categoria em formato inesperado.');
    }
    return { ...category, name: typeof category.name === 'string' && category.name.trim() ? category.name : 'Sem categoria', total: Number(category.total) };
  });
  return result;
}
