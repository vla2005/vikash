import { ApiError, authenticatedFetch, postJson } from './apiClient';
import { API_BASE_URL } from '../config/api';
import { RESET_TOKEN_PATTERN, validateRecoveryEmail } from '../utils/passwordRecovery';
import { validateNewPassword } from '../utils/passwordValidation';

async function sendRecoveryRequest(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try { await postJson(path, body, undefined, { signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

export async function requestPasswordReset({ email }) {
  const errors = validateRecoveryEmail({ email });
  if (Object.keys(errors).length) { throw new ApiError('Confira o e-mail informado.', 400, errors); }
  await sendRecoveryRequest('/api/auth/forgot-password', { email: email.trim().toLowerCase() });
}

export async function resetPassword({ token, newPassword }) {
  if (!RESET_TOKEN_PATTERN.test(token || '')) {
    throw new ApiError('Link de recuperação inválido.', 400, { token: 'Solicite um novo link de recuperação.' });
  }
  const error = validateNewPassword(newPassword);
  if (error) { throw new ApiError('Confira sua nova senha.', 400, { newPassword: error }); }
  await sendRecoveryRequest('/api/auth/reset-password', { token, newPassword });
}

export async function fetchCurrentUser(accessToken, renew = true) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const options = {
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    };
    const response = renew ? await authenticatedFetch('/api/auth/me', options, accessToken)
      : await fetch(`${API_BASE_URL}/api/auth/me`, options);
    if (!response.ok) { throw new ApiError('Não foi possível validar sua sessão. Tente novamente.', response.status); }
    const user = await response.json();
    if (!user || typeof user.name !== 'string' || typeof user.email !== 'string') {
      throw new Error('Não foi possível validar sua sessão. Entre novamente.');
    }
    return user;
  } finally { clearTimeout(timeout); }
}

async function authenticate(path, values) {
  const session = await postJson(path, values);
  if (!session?.accessToken || !session?.user) {
    throw new Error('A API não retornou os dados de autenticação esperados.');
  }
  return session;
}

export const registerUser = ({ name, email, password }) => authenticate('/api/auth/register', { name: name.trim(), email: email.trim(), password });
export const loginUser = ({ email, password }) => authenticate('/api/auth/login', { email: email.trim(), password });
export async function refreshSession(refreshToken) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let session;
  try { session = await postJson('/api/auth/refresh', { refreshToken }, undefined, { signal: controller.signal }); }
  finally { clearTimeout(timeout); }
  if (!session?.accessToken || !session.refreshToken || !session.user || !(Number(session.expiresIn) > 0)) {
    throw new Error('A API não retornou os dados de renovação esperados.');
  }
  return { ...session, expiresAt: Date.now() + Number(session.expiresIn) * 1000 };
}

export async function logoutUser(refreshToken, accessToken) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    // The provider renews the session first, so the body uses the current refresh token.
    // Do not automatically rotate it again while sending this request.
    await postJson('/api/auth/logout', refreshToken ? { refreshToken } : undefined, undefined, {
      headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal,
    });
  } finally { clearTimeout(timeout); }
}
