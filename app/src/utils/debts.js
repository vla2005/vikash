import { toCents } from './initialInvoices';
import { formatCurrency } from './money';
import { initialPaymentDate } from './paymentDate';

export const formatDebtCents = amount => formatCurrency(amount / 100);
export const debtToday = () => initialPaymentDate().date.split('/').reverse().join('-');

export function summarizeDebts(debts, today) {
  let openTotal = 0;
  let overdueTotal = 0;
  let dueByMonthEnd = 0;
  let originalTotal = 0;
  const currentMonth = today.slice(0, 7);
  const months = {};
  const rows = debts.map(debt => {
    let open = 0;
    for (const item of debt.installments) {
      const cents = toCents(item.amount);
      const month = item.dueDate.slice(0, 7);
      months[month] = (months[month] || 0) + cents;
      if (item.dueDate < today) {
        overdueTotal += cents;
      }
      if (month <= currentMonth) dueByMonthEnd += cents;
      open += cents;
    }
    openTotal += open;
    originalTotal += toCents(debt.totalAmount);
    return { ...debt, open, next: debt.installments[0] };
  });
  return {
    openTotal, overdueTotal, dueByMonthEnd, paidTotal: originalTotal - openTotal,
    months, monthKeys: Object.keys(months).sort(), rows,
  };
}
