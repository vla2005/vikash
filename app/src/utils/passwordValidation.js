export const PASSWORD_HINT = 'Use pelo menos 8 caracteres, uma letra maiúscula, um número e um caractere especial.';

function utf8Size(value) {
  let size = 0;
  for (const character of value) {
    const code = character.codePointAt(0);
    size += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return size;
}

export function validateNewPassword(password) {
  if (!password?.trim()) { return 'Informe uma senha.'; }
  if (password.length < 8) { return 'Use pelo menos 8 caracteres.'; }
  if (utf8Size(password) > 72) { return 'Use até 72 bytes. Acentos podem ocupar mais de um byte.'; }
  if (!/\p{Lu}/u.test(password)) { return 'Inclua pelo menos uma letra maiúscula.'; }
  if (!/[0-9]/.test(password)) { return 'Inclua pelo menos um número.'; }
  if (!/[\p{P}\p{S}]/u.test(password)) { return 'Inclua pelo menos um caractere especial.'; }
  return '';
}
