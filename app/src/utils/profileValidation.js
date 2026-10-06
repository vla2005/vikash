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

function utf8Size(value) {
  let size = 0;
  for (const character of value) {
    const code = character.codePointAt(0);
    size += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return size;
}

export function validatePasswordChange({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!currentPassword.trim()) { errors.currentPassword = 'Informe sua senha atual.'; }
  if (!newPassword.trim() || newPassword.length < 8) {
    errors.newPassword = 'Use pelo menos 8 caracteres.';
  } else if (utf8Size(newPassword) > 72) {
    errors.newPassword = 'Use até 72 bytes. Acentos podem ocupar mais de um byte.';
  } else if (newPassword === currentPassword) {
    errors.newPassword = 'Escolha uma senha diferente da atual.';
  }
  if (!confirmPassword) { errors.confirmPassword = 'Confirme sua nova senha.'; }
  else if (newPassword !== confirmPassword) { errors.confirmPassword = 'As senhas precisam ser iguais.'; }
  return errors;
}
