import { formatCurrency, parseCurrency } from './money';

export const invoiceMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const toCents = value => Math.round(Number(value || 0) * 100);

export function invoiceMonthLabel(reference) {
  const [year, month] = reference.split('-');
  return `${invoiceMonths[Number(month) - 1]} ${year}`;
}

export function displayInvoiceDate(iso) {
  return iso.split('-').reverse().join('/');
}

export function parseInvoiceDate(value) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) { throw new Error('Use o formato DD/MM/AAAA.'); }
  const [day, month, year] = value.split('/').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('Informe uma data válida.');
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function initialInvoiceDates(reference, card) {
  const [year, month] = reference.split('-').map(Number);
  function dateInMonth(offset, day) {
    const first = new Date(Date.UTC(year, month - 1 + offset, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    first.setUTCDate(Math.min(day, lastDay));
    return first.toISOString().slice(0, 10);
  }
  const dueDate = dateInMonth(0, card.dueDay);
  let closingDate = dateInMonth(0, card.closingDay);
  if (closingDate >= dueDate) { closingDate = dateInMonth(-1, card.closingDay); }
  return { closingDate, dueDate };
}

export function initialInvoiceRow(id, referenceMonth, card, invoice) {
  const dates = invoice || card.invoices.find(item => item.referenceMonth === referenceMonth) || initialInvoiceDates(referenceMonth, card);
  return { id, referenceMonth, amount: formatCurrency(invoice?.initialAmount || 0),
    closingDate: displayInvoiceDate(dates.closingDate), dueDate: displayInvoiceDate(dates.dueDate),
    original: Boolean(invoice), startingAmount: invoice?.initialAmount || 0, expanded: !invoice };
}

export function validateInitialInvoices(rows, card) {
  const errors = {};
  const months = new Set();
  const invoices = rows.map(row => {
    const fields = {};
    const initialAmount = parseCurrency(row.amount);
    const existing = card.invoices.find(invoice => invoice.referenceMonth === row.referenceMonth);
    if (months.has(row.referenceMonth)) { fields.referenceMonth = 'Este mês já está na distribuição.'; }
    months.add(row.referenceMonth);
    if (existing?.status === 'PAID') { fields.referenceMonth = 'Esta fatura já foi paga e não pode ser alterada.'; }
    if (initialAmount < 0 || initialAmount > 9999999999999.99 || (!row.original && initialAmount === 0)) {
      fields.initialAmount = row.original ? 'Informe um valor válido, a partir de zero.' : 'Informe um valor maior que zero.';
    }
    let closingDate; let dueDate;
    try { closingDate = parseInvoiceDate(row.closingDate); } catch (error) { fields.closingDate = error.message; }
    try { dueDate = parseInvoiceDate(row.dueDate); } catch (error) { fields.dueDate = error.message; }
    if (closingDate && dueDate && closingDate >= dueDate) { fields.dueDate = 'O vencimento deve ser depois do fechamento.'; }
    if (dueDate && dueDate.slice(0, 7) !== row.referenceMonth) { fields.dueDate = 'O vencimento deve estar no mês escolhido.'; }
    if (existing && (closingDate !== existing.closingDate || dueDate !== existing.dueDate)) {
      fields.closingDate = 'Mantenha as datas da fatura existente.';
    }
    if (Object.keys(fields).length) { errors[row.id] = fields; }
    return { referenceMonth: row.referenceMonth, initialAmount, closingDate, dueDate };
  });
  const reserved = toCents(card.unallocatedUsedLimit) + card.invoices.filter(invoice => invoice.status !== 'PAID')
    .reduce((sum, invoice) => sum + toCents(invoice.initialAmount), 0);
  if (invoices.reduce((sum, invoice) => sum + toCents(invoice.initialAmount), 0) > reserved) {
    errors.invoices = 'A distribuição ultrapassa o valor inicial disponível. Reduza os valores das faturas.';
  }
  return { errors, invoices };
}
