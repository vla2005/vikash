import { initialInvoiceDates, initialInvoiceRow, parseInvoiceDate, validateInitialInvoices } from '../src/utils/initialInvoices';

const card = { closingDay: 3, dueDay: 10, unallocatedUsedLimit: 2200, invoices: [] };

test('datas respeitam o mês de vencimento, a virada do ano e meses curtos', () => {
  expect(initialInvoiceDates('2026-10', card)).toEqual({ closingDate: '2026-10-03', dueDate: '2026-10-10' });
  expect(initialInvoiceDates('2027-01', { closingDay: 31, dueDay: 5 })).toEqual({ closingDate: '2026-12-31', dueDate: '2027-01-05' });
  expect(initialInvoiceDates('2028-02', { closingDay: 20, dueDay: 31 })).toEqual({ closingDate: '2028-02-20', dueDate: '2028-02-29' });
  expect(initialInvoiceDates('2027-02', { closingDay: 31, dueDay: 31 })).toEqual({ closingDate: '2027-01-31', dueDate: '2027-02-28' });
});

test('aceita datas futuras válidas e rejeita datas inexistentes', () => {
  expect(parseInvoiceDate('29/02/2028')).toBe('2028-02-29');
  expect(() => parseInvoiceDate('29/02/2027')).toThrow('data válida');
  expect(() => parseInvoiceDate('31/04/2026')).toThrow('data válida');
});

test('distribuição parcial mantém a diferença reservada e bloqueia excesso ou duplicidade', () => {
  const row = { ...initialInvoiceRow('new', '2026-10', card), amount: 'R$ 800,00' };
  expect(validateInitialInvoices([row], card)).toMatchObject({ errors: {}, invoices: [{ initialAmount: 800, closingDate: '2026-10-03', dueDate: '2026-10-10' }] });
  expect(validateInitialInvoices([{ ...row, amount: 'R$ 2.200,01' }], card).errors.invoices).toBeTruthy();
  expect(validateInitialInvoices([row, { ...row, id: 'other' }], card).errors.other.referenceMonth).toBeTruthy();
});

test('valida o lote todo para mover valor entre meses sem consumir limite adicional', () => {
  const invoice = { uuid: 'old', referenceMonth: '2026-10', initialAmount: 2200, status: 'CLOSED', closingDate: '2026-10-03', dueDate: '2026-10-10' };
  const existingCard = { ...card, unallocatedUsedLimit: 0, invoices: [invoice] };
  const old = { ...initialInvoiceRow('old', invoice.referenceMonth, existingCard, invoice), amount: 'R$ 0,00' };
  const next = { ...initialInvoiceRow('new', '2026-11', existingCard), amount: 'R$ 2.200,00' };
  expect(validateInitialInvoices([next, old], existingCard).errors).toEqual({});
  expect(validateInitialInvoices([next, { ...old, amount: 'R$ 0,01' }], existingCard).errors.invoices).toBeTruthy();
});

test('faturas pagas, fechamento posterior e vencimento fora do mês são bloqueados', () => {
  const row = { ...initialInvoiceRow('new', '2026-10', card), amount: 'R$ 800,00' };
  expect(validateInitialInvoices([{ ...row, dueDate: '10/11/2026' }], card).errors.new.dueDate).toBeTruthy();
  expect(validateInitialInvoices([{ ...row, closingDate: '11/10/2026' }], card).errors.new.dueDate).toBeTruthy();
  const paidCard = { ...card, invoices: [{ referenceMonth: '2026-10', status: 'PAID', initialAmount: 800, closingDate: '2026-10-03', dueDate: '2026-10-10' }] };
  expect(validateInitialInvoices([row], paidCard).errors.new.referenceMonth).toContain('paga');
});

test('comparações usam centavos para não rejeitar valores com arredondamento binário', () => {
  const row = { ...initialInvoiceRow('new', '2026-10', card), amount: 'R$ 0,30' };
  expect(validateInitialInvoices([row], { ...card, unallocatedUsedLimit: 0.1 + 0.2 }).errors).toEqual({});
});
