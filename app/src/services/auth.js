import { ApiError, authenticatedFetch, postJson } from './apiClient';
import { API_BASE_URL } from '../config/api';

export async function fetchCurrentUser(accessToken, renew = true) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const options = {
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    };
    const response = renew ? await authenticatedFetch('/api/v1/auth/me', options, accessToken)
      : await fetch(`${API_BASE_URL}/api/v1/auth/me`, options);
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

export const registerUser = ({ name, email, password }) => authenticate('/api/v1/auth/register', { name: name.trim(), email: email.trim(), password });
export const loginUser = ({ email, password }) => authenticate('/api/v1/auth/login', { email: email.trim(), password });
export async function refreshSession(refreshToken) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let session;
  try { session = await postJson('/api/v1/auth/refresh', { refreshToken }, undefined, { signal: controller.signal }); }
  finally { clearTimeout(timeout); }
  if (!session?.accessToken || !session.refreshToken || !session.user || !(Number(session.expiresIn) > 0)) {
    throw new Error('A API não retornou os dados de renovação esperados.');
  }
  return { ...session, expiresAt: Date.now() + Number(session.expiresIn) * 1000 };
}
