import { API_BASE_URL } from '../config/api';

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function postJson(path, body, accessToken, options = {}) {
  return requestJson('POST', path, body, accessToken, options);
}

export function putJson(path, body, accessToken, options = {}) {
  return requestJson('PUT', path, body, accessToken, options);
}

async function requestJson(method, path, body, accessToken, options) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...options.headers },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Confira sua conexão e tente novamente.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = response.status === 409 ? options.conflictMessage || 'Esse e-mail já está cadastrado. Entre com sua senha.'
      : response.status === 401 ? 'Não foi possível autenticar. Confira seus dados ou entre novamente.'
        : response.status >= 500 ? 'Não foi possível concluir agora. Tente novamente.'
          : data?.message || 'Não foi possível concluir a solicitação.';
    throw new ApiError(message, response.status, data?.fieldErrors || {});
  }
  return data;
}
