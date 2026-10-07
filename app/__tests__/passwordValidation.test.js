import { validateLogin, validateRegistration } from '../src/utils/validation';
import { validatePasswordChange } from '../src/utils/profileValidation';

const registration = password => validateRegistration({ name: 'Lívia Matos', email: 'livia@example.com', password, confirmPassword: password });
const passwordChange = password => validatePasswordChange({ currentPassword: 'old123', newPassword: password, confirmPassword: password });

test.each([
  ['Ab1!', '8 caracteres'],
  ['abcdef1!', 'maiúscula'],
  ['Abcdefg!', 'número'],
  ['Abcdefg1', 'especial'],
  ['Abcdef1 ', 'especial'],
  ['Abcdef1á', 'especial'],
  ['A'.repeat(71) + '1!', '72 bytes'],
  ['Á' + 'á'.repeat(34) + 'ab1!', '72 bytes'],
])('cadastro e troca de senha rejeitam %s pela mesma regra', (password, message) => {
  expect(registration(password).password).toContain(message);
  expect(passwordChange(password).newPassword).toContain(message);
});

test.each(['Abcdef1!', 'Ábcdef1!', 'A'.repeat(70) + '1!', 'Á' + 'á'.repeat(33) + 'ab1!'])
('cadastro e troca de senha aceitam %s', password => {
  expect(registration(password)).toEqual({});
  expect(passwordChange(password)).toEqual({});
});

test('troca de senha mantém verificação da confirmação e exige senha diferente da atual', () => {
  expect(validatePasswordChange({ currentPassword: 'Abcdef1!', newPassword: 'Abcdef1!', confirmPassword: 'Abcdef1!' }))
    .toHaveProperty('newPassword', 'Escolha uma senha diferente da atual.');
  expect(validatePasswordChange({ currentPassword: 'old123', newPassword: 'Abcdef1!', confirmPassword: 'Abcdef2!' }))
    .toHaveProperty('confirmPassword');
});

test('login continua aceitando senhas antigas que não seguem a nova regra', () => {
  expect(validateLogin({ email: 'livia@example.com', password: 'old123' })).toEqual({});
});
