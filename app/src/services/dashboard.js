import { ApiError, authenticatedFetch } from './apiClient';

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
  return result;
}
