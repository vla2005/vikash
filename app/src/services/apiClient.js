import { API_BASE_URL } from '../config/api';

let tokenResolver;
export function configureAuth(resolver) {
  tokenResolver = resolver;
  return () => { if (tokenResolver === resolver) { tokenResolver = undefined; } };
}

// Cada tentativa reconstrói os headers com o token atual, inclusive access_token.
export async function authenticatedFetch(path, options = {}, accessToken) {
  let token = accessToken && tokenResolver ? await tokenResolver(accessToken, false) : accessToken;
  const send = current => fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...options.headers, ...(current ? { Authorization: `Bearer ${current}` } : {}),
      ...(options.headers?.access_token ? { access_token: current } : {}) },
  });
  let response = await send(token);
  if (response.status === 401 && token && tokenResolver) {
    token = await tokenResolver(token, true);
    response = await send(token);
    if (response.status === 401) { await tokenResolver(token, 'invalidate'); }
  }
  return response;
}

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

export function patchJson(path, body, accessToken, options = {}) {
  return requestJson('PATCH', path, body, accessToken, options);
}

async function requestJson(method, path, body, accessToken, options) {
  let response;
  try {
    response = await authenticatedFetch(path, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...options.headers },
      body: JSON.stringify(body),
      signal: options.signal,
    }, accessToken);
  } catch (cause) {
    if (cause instanceof ApiError) { throw cause; }
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
