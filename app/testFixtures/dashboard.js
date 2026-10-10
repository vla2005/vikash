// Shared data for dashboard tests and local visual checks.
export const dashboard = {
  totalBalance: 14850, incomes: 4200, expenses: 1830,
  incomesPercentageChange: 20, expensesPercentageChange: -12,
  balanceEvolution: Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-${String(index + 4).padStart(2, '0')}`, balance: 14000 + index * 100 })),
  creditCards: [{ uuid: 'card', lastFourDigits: 32, creditLimit: 5000, availableLimit: 750,
    financialInstitution: { name: 'Itaú' }, currentInvoice: null }],
  accounts: [{ uuid: 'account', description: 'Conta principal', type: 'CONTA_CORRENTE', balance: 2400, financialInstitution: { name: 'Inter' } }],
  expensesPerCategory: [
    { defaultCategoryId: 1, name: 'Alimentação', color: 'royal', total: 1260 },
    { defaultCategoryId: 2, name: 'Moradia', color: 'orange', total: 985 },
    { defaultCategoryId: 3, name: 'Transporte', color: 'emerald', total: 550 },
    { defaultCategoryId: 4, name: 'Outros', color: 'purple', total: 1145 },
  ],
  recentTransactions: [
    { uuid: 'expense', description: 'Farmácia', amount: 50, type: 'EXPENSE', occurredAt: '2026-10-10T12:00:00', paymentMethod: 'PIX', institutionName: 'Inter', categoryColor: 'sage', categoryIcon: 'health' },
    { uuid: 'income', description: 'Freelance', amount: 800, type: 'INCOME', occurredAt: '2026-10-08T12:00:00', paymentMethod: 'PIX', institutionName: 'Inter', categoryColor: 'mint', categoryIcon: 'briefcase' },
  ],
};
export const credit = {
  purchasesTotal: 1200, purchaseCount: 1, invoicesTotal: 320,
  monthlyPurchases: [5, 6, 7, 8, 9, 10].map(month => ({ referenceMonth: `2026-${String(month).padStart(2, '0')}`, total: month === 10 ? 1200 : 0, purchaseCount: month === 10 ? 1 : 0 })),
  expensesPerCategory: [{ defaultCategoryId: 2, name: 'Moradia', color: 'orange', total: 1200 }],
  upcomingInvoices: [{ uuid: 'invoice', referenceMonth: '2026-10', total: 320, dueDate: '2026-10-12', status: 'CLOSED',
    creditCard: dashboard.creditCards[0] }],
  recentPurchases: [{ uuid: 'purchase', description: 'Televisão', amount: 1200, occurredAt: '2026-10-09T18:00:00', installmentCount: 5,
    creditCard: dashboard.creditCards[0], category: { name: 'Moradia', color: 'orange', icon: 'house' } }],
};
