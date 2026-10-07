import { validateNewPassword } from './passwordValidation';

export function validateProfile({ name, email }) {
  const errors = {};
  if (name.trim().length > 100 || name.replace(/\s/g, '').length < 2) {
    errors.name = 'Use entre 2 e 100 caracteres para o nome.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Informe um e-mail válido.';
  } else if (email.trim().length > 150) {
    errors.email = 'Use um e-mail com até 150 caracteres.';
  }
  return errors;
}

export function validatePasswordChange({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!currentPassword.trim()) { errors.currentPassword = 'Informe sua senha atual.'; }
  const passwordError = validateNewPassword(newPassword);
  if (passwordError) {
    errors.newPassword = passwordError;
  } else if (newPassword === currentPassword) {
    errors.newPassword = 'Escolha uma senha diferente da atual.';
  }
  if (!confirmPassword) { errors.confirmPassword = 'Confirme sua nova senha.'; }
  else if (newPassword !== confirmPassword) { errors.confirmPassword = 'As senhas precisam ser iguais.'; }
  return errors;
}
