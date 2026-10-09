import { validateNewPassword } from './passwordValidation';

export const RECOVERY_MESSAGE = 'Se houver uma conta com esse e-mail, enviaremos as instruções de recuperação.';
export const RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function validateRecoveryEmail({ email }) {
  return email.trim().length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? {} : { email: 'Informe um e-mail válido.' };
}

export function validatePasswordReset({ token, newPassword, confirmPassword }) {
  const errors = {};
  if (!RESET_TOKEN_PATTERN.test(token || '')) { errors.token = 'Reabra o link recebido por e-mail ou solicite um novo.'; }
  const passwordError = validateNewPassword(newPassword);
  if (passwordError) { errors.newPassword = passwordError; }
  if (!confirmPassword) { errors.confirmPassword = 'Confirme sua nova senha.'; }
  else if (newPassword !== confirmPassword) { errors.confirmPassword = 'As senhas precisam ser iguais.'; }
  return errors;
}

// Aceita a URL da web, o link do Expo Go e o esquema da build instalada.
export function parseRecoveryLink(url) {
  if (!url || typeof url !== 'string') { return null; }
  const [address, query = ''] = url.split('?');
  const path = (address.startsWith('vikash://') ? address.slice(9)
    : address.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, ''))
    .replace(/^\/--\//, '/').replace(/^\/+|\/+$/g, '');
  if (path === 'login') { return { kind: 'login' }; }
  if (path === 'forgot-password') { return { kind: 'forgot' }; }
  if (path !== 'reset-password') { return null; }
  const tokens = query.split('#')[0].split('&').filter(value => value.startsWith('token='));
  let token = '';
  try { if (tokens.length === 1) { token = decodeURIComponent(tokens[0].slice(6)); } }
  catch { /* Um token malformado é apresentado como um link inválido. */ }
  return { kind: 'reset', token };
}
