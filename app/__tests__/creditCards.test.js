import { creditCardLabel, formatLastFourDigits } from '../src/utils/creditCards';

test.each([[0, '0000'], [32, '0032'], [9999, '9999']])('preserva quatro dígitos na exibição de %s', (value, expected) => {
  expect(formatLastFourDigits(value)).toBe(expected);
  expect(creditCardLabel({ lastFourDigits: value })).toBe(`Cartão final ${expected}`);
});

test('cartões legados não recebem um final inventado', () => {
  expect(formatLastFourDigits(null)).toBe('');
  expect(creditCardLabel({ lastFourDigits: null })).toBe('Cartão sem final informado');
});
