import {
  brazilianMoney,
  editableMoney,
  entryFields,
  reviewedAnalysis,
  validEntryDate,
} from '../src/utils/voiceEntry';
describe('Brazilian financial review', () => {
  test.each([
    ['35', '35.00'],
    ['R$ 35,50', '35.50'],
    ['2.500', '2500.00'],
    ['2.500,09', '2500.09'],
    ['0,01', '0.01'],
    ['89,90', '89.90'],
  ])('preserves cents: %s', (input, expected) =>
    expect(brazilianMoney(input)).toBe(expected),
  );
  test.each([
    '-1',
    '0',
    '35.50',
    '1,005',
    '2.50,00',
    '1e3',
    '99999999999999',
    'NaN',
    '',
  ])('rejects ambiguous/invalid %s', input =>
    expect(brazilianMoney(input)).toBeNull(),
  );
  test('keeps missing data empty for explicit correction', () =>
    expect(entryFields({})).toMatchObject({
      amount: '',
      date: '',
      accountUuid: '',
      type: '',
    }));
  test('validates calendar dates', () => {
    expect(validEntryDate('2026-02-30')).toBe(false);
    expect(validEntryDate('2024-02-29')).toBe(true);
  });
  const fields = {
    description: 'Almoço',
    amount: '35,50',
    type: 'EXPENSE',
    paymentMethod: 'PIX',
    date: '2026-10-21',
    accountUuid: 'mine',
    creditCardUuid: '',
    installmentCount: '1',
    category: 'default:Alimentação',
  };
  test('produces decimal strings and original local time', () =>
    expect(
      reviewedAnalysis(fields, { occurredAt: '2026-10-20T15:30:00' }),
    ).toMatchObject({
      amount: '35.50',
      occurredAt: '2026-10-21T15:30:00',
      accountUuid: 'mine',
      missingFields: [],
    }));
  test('preserves salary as income', () =>
    expect(
      reviewedAnalysis(
        { ...fields, description: 'Salário', type: 'INCOME', amount: '2.500' },
        {},
      ).amount,
    ).toBe('2500.00'));
  test('requires account rather than guessing', () =>
    expect(() => reviewedAnalysis({ ...fields, accountUuid: '' }, {})).toThrow(
      'conta',
    ));
  test('credit uses only card and total amount, existing backend distributes installments', () =>
    expect(
      reviewedAnalysis(
        {
          ...fields,
          paymentMethod: 'CREDIT_CARD',
          creditCardUuid: 'card',
          amount: '300',
          installmentCount: '3',
        },
        {},
      ),
    ).toMatchObject({
      amount: '300.00',
      accountUuid: null,
      creditCardUuid: 'card',
      installmentCount: 3,
    }));
  test('rejects non-credit installments and fractional counts', () => {
    expect(() =>
      reviewedAnalysis({ ...fields, installmentCount: '3' }, {}),
    ).toThrow();
    expect(() =>
      reviewedAnalysis({ ...fields, installmentCount: '1.5' }, {}),
    ).toThrow();
  });
  test('formats incoming money for editing', () =>
    expect(editableMoney('89.90')).toBe('89,90'));
});
