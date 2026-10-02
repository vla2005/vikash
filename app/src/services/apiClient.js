import { API_BASE_URL } from '../config/api';

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function postJson(path, body, accessToken) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Confira sua conexão e tente novamente.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = response.status === 409 ? 'Esse e-mail já está cadastrado. Entre com sua senha.'
      : response.status === 401 ? 'Não foi possível autenticar. Confira seus dados ou entre novamente.'
        : response.status >= 500 ? 'Não foi possível concluir agora. Tente novamente.'
          : data?.message || 'Não foi possível concluir a solicitação.';
    throw new ApiError(message, response.status, data?.fieldErrors || {});
  }
  return data;
}
