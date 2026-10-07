import { validateNewPassword } from './passwordValidation';

export function validateLogin({ email, password }) {
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { errors.email = 'Informe um e-mail válido.'; }
  if (!password) { errors.password = 'Informe sua senha.'; }
  return errors;
}

export function validateRegistration(values) {
  const errors = validateLogin(values);
  if (values.name.trim().length < 2 || values.name.trim().length > 100) { errors.name = 'Use entre 2 e 100 caracteres.'; }
  const passwordError = validateNewPassword(values.password);
  if (passwordError) { errors.password = passwordError; }
  if (!values.confirmPassword) { errors.confirmPassword = 'Confirme sua senha.'; }
  else if (values.password !== values.confirmPassword) { errors.confirmPassword = 'As senhas precisam ser iguais.'; }
  return errors;
}
