export function validateLogin({ email, password }) {
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { errors.email = 'Informe um e-mail válido.'; }
  if (!password) { errors.password = 'Informe sua senha.'; }
  return errors;
}

export function validateRegistration(values) {
  const errors = validateLogin(values);
  if (values.name.trim().length < 2 || values.name.trim().length > 100) { errors.name = 'Use entre 2 e 100 caracteres.'; }
  if (values.password.length < 8 || values.password.length > 100) { errors.password = 'Use entre 8 e 100 caracteres.'; }
  if (!values.confirmPassword) { errors.confirmPassword = 'Confirme sua senha.'; }
  else if (values.password !== values.confirmPassword) { errors.confirmPassword = 'As senhas precisam ser iguais.'; }
  return errors;
}
