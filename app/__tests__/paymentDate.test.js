import { maskPaymentDate, maskPaymentTime, parsePaymentDate } from '../src/utils/paymentDate';

test('formata e converte data e horario informados sem converter o fuso', () => {
  expect(maskPaymentDate('04102026')).toBe('04/10/2026');
  expect(maskPaymentTime('1900')).toBe('19:00');
  expect(parsePaymentDate('04/10/2026', '19:00', new Date(2026, 9, 5))).toBe('2026-10-04T19:00:00');
});
test('rejeita datas inexistentes, horario invalido, campos incompletos e futuro', () => {
  const now = new Date(2026, 9, 5);
  expect(() => parsePaymentDate('31/02/2026', '19:00', now)).toThrow('válidos');
  expect(() => parsePaymentDate('04/10/2026', '24:00', now)).toThrow('válidos');
  expect(() => parsePaymentDate('04/10/2026', '19:60', now)).toThrow('válidos');
  expect(() => parsePaymentDate('04/10', '19:00', now)).toThrow('DD/MM/AAAA');
  expect(() => parsePaymentDate('06/10/2026', '19:00', now)).toThrow('futuro');
});
