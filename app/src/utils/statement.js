import { normalizeCategoryName } from '../data/categories';
const months = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function indexStatementRows(rows) {
  const accounts = new Set();
  const categories = new Set();
  const searchText = new Map();
  for (const row of rows) {
    if (row.account) {
      accounts.add(row.account);
    }
    if (row.category) {
      categories.add(row.category);
    }
    searchText.set(
      row.id,
      normalizeCategoryName(
        [
          row.description,
          row.category,
          row.account,
          row.destinationAccount,
          row.payment,
        ]
          .filter(Boolean)
          .join(' '),
      ),
    );
  }
  return { accounts: [...accounts], categories: [...categories], searchText };
}

export function filterStatementRows(
  rows,
  searchText,
  monthKey,
  query,
  type,
  filters,
) {
  const minimum = filters.min ? Number(filters.min.replace(',', '.')) : null;
  const maximum = filters.max ? Number(filters.max.replace(',', '.')) : null;
  return rows.filter(
    row =>
      row.date.startsWith(monthKey) &&
      (type === 'ALL' ||
        row.type === type ||
        (type === 'EXPENSE' && row.type === 'INVOICE_PAYMENT')) &&
      (!query || searchText.get(row.id).includes(query)) &&
      (!filters.accounts.length ||
        filters.accounts.some(
          account =>
            account === row.account || account === row.destinationAccount,
        )) &&
      (!filters.categories.length ||
        filters.categories.includes(row.category)) &&
      (!filters.payments.length || filters.payments.includes(row.payment)) &&
      (minimum === null || row.amount >= minimum) &&
      (maximum === null || row.amount <= maximum) &&
      (filters.transfers || row.type !== 'TRANSFER'),
  );
}

export function summarizeStatementRows(rows, today) {
  const days = new Map();
  const dayById = new Map();
  const totals = { INCOME: 0, EXPENSE: 0 };
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  ).toDateString();
  const todayLabel = today.toDateString();
  for (const row of rows) {
    if (row.type === 'INCOME') {
      totals.INCOME += row.amount;
    }
    if (row.type === 'EXPENSE' || row.type === 'INVOICE_PAYMENT') {
      totals.EXPENSE += row.amount;
    }
    if (!days.has(row.date)) {
      const date = new Date(`${row.date}T12:00:00`);
      const label = date.toDateString();
      days.set(row.date, {
        date: row.date,
        label: `${
          label === todayLabel ? 'Hoje, ' : label === yesterday ? 'Ontem, ' : ''
        }${date.getDate()} de ${months[date.getMonth()]}`,
        rows: [],
      });
    }
    days.get(row.date).rows.push(row);
    dayById.set(row.id, row.date);
  }
  return {
    groups: [...days.values()].sort((a, b) => b.date.localeCompare(a.date)),
    totals,
    dayById,
  };
}
