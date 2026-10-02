import { validateLogin, validateRegistration } from '../src/utils/validation';
import { maskCurrency, parseCurrency } from '../src/utils/money';

describe('Formularios', () => {
  test('bloqueia e-mail invalido e senha vazia', () => {
    expect(validateLogin({ email: 'email-sem-dominio', password: '' })).toEqual({ email: expect.any(String), password: expect.any(String) });
  });
  test('aceita e-mail valido com espacos externos', () => {
    expect(validateLogin({ email: '  viktor@exemplo.com ', password: 'senha-valida' })).toEqual({});
  });
  test('bloqueia confirmacao diferente e senha curta', () => {
    const errors = validateRegistration({ name: 'Viktor Lucena', email: 'viktor@exemplo.com', password: '123456', confirmPassword: '1234567' });
    expect(errors.password).toBeDefined();
    expect(errors.confirmPassword).toBeDefined();
  });
  test('aceita cadastro completo', () => {
    expect(validateRegistration({ name: 'Viktor Lucena', email: 'viktor@exemplo.com', password: 'senha-segura', confirmPassword: 'senha-segura' })).toEqual({});
  });
});
describe('Saldo em reais', () => {
  test('converte a mascara pt-BR em numero sem perder os centavos', () => { expect(parseCurrency('R$ 9.350,27')).toBe(9350.27); });
  test('aplica mascara ao digitar centavos', () => { expect(maskCurrency('12345').replace(/\s/g, '')).toBe('R$123,45'); });
  test('saldo vazio vira zero', () => { expect(parseCurrency('')).toBe(0); });
});
