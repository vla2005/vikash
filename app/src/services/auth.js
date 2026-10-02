import { postJson } from './apiClient';
import { API_BASE_URL } from '../config/api';

export async function fetchCurrentUser(accessToken) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    if (!response.ok) { throw new Error('Sua sessão não é válida. Entre novamente.'); }
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
