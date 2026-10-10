export const hiddenAmount = '••••••';

export function previousPeriod({ year, month }) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function shiftPeriod({ year, month }, direction) {
  const nextMonth = month + direction;
  if (nextMonth === 0) { return { year: year - 1, month: 12 }; }
  if (nextMonth === 13) { return { year: year + 1, month: 1 }; }
  return { year, month: nextMonth };
}

export function spendingPace(expenses, period, today = new Date()) {
  const selected = period.year * 12 + period.month;
  const current = today.getFullYear() * 12 + today.getMonth() + 1;
  if (selected > current) { return null; }
  const daysInMonth = new Date(period.year, period.month, 0).getDate();
  const days = selected === current ? today.getDate() : daysInMonth;
  const daily = expenses / days;
  return { daily, projection: selected === current ? daily * daysInMonth : null };
}

export function toRecentPurchaseRows(purchases = []) {
  return purchases.map(purchase => ({
    id: purchase.uuid, purchaseUuid: purchase.uuid, description: purchase.description,
    amount: purchase.amount, type: 'CREDIT_PURCHASE', date: purchase.occurredAt.slice(0, 10),
    occurredAt: purchase.occurredAt, payment: 'Crédito', account: purchase.creditCard.description,
    color: purchase.category?.color, icon: purchase.category?.icon || 'creditCard',
    installmentCount: purchase.installmentCount,
  }));
}
