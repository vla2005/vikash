import { API_BASE_URL } from '../config/api';

let tokenResolver;
let profileGeneration = 0;
const pendingRequests = new Set();
export function cancelAuthenticatedRequests() {
  profileGeneration += 1;
  for (const controller of pendingRequests) { controller.abort(); }
  pendingRequests.clear();
}
export function configureAuth(resolver) {
  tokenResolver = resolver;
  return () => { if (tokenResolver === resolver) { tokenResolver = undefined; } };
}

// Cada tentativa reconstrói os headers com o token atual, inclusive access_token.
export async function authenticatedFetch(path, options = {}, accessToken) {
  const version = profileGeneration;
  const ensureCurrent = () => {
    if (accessToken && version !== profileGeneration) {
      throw new ApiError('O perfil ativo mudou. Abra a tela novamente.', 401);
    }
  };
  let token = accessToken && tokenResolver ? await tokenResolver(accessToken, false) : accessToken;
  ensureCurrent();
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) { controller.abort(); }
  options.signal?.addEventListener('abort', abort);
  if (accessToken) { pendingRequests.add(controller); }
  const send = current => fetch(`${API_BASE_URL}${path}`, {
    ...options,
    signal: controller.signal,
    headers: { ...options.headers, ...(current ? { Authorization: `Bearer ${current}` } : {}),
      ...(options.headers?.access_token ? { access_token: current } : {}) },
  });
  try {
    let response = await send(token);
    ensureCurrent();
    if (response.status === 401 && token && tokenResolver) {
      token = await tokenResolver(token, true);
      ensureCurrent();
      response = await send(token);
      ensureCurrent();
      if (response.status === 401) { await tokenResolver(token, 'invalidate'); }
    }
    return response;
  } finally {
    pendingRequests.delete(controller);
    options.signal?.removeEventListener('abort', abort);
  }
}

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}, details = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = typeof details.code === 'string' ? details.code : undefined;
    this.missingFields = Array.isArray(details.missingFields)
      ? details.missingFields.filter(field => typeof field === 'string') : [];
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

export function deleteJson(path, accessToken, options = {}) {
  return requestJson('DELETE', path, undefined, accessToken, options);
}

async function requestJson(method, path, body, accessToken, options) {
  const version = profileGeneration;
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
  if (accessToken && version !== profileGeneration) {
    throw new ApiError('O perfil ativo mudou. Abra a tela novamente.', 401);
  }
  if (!response.ok) {
    const message = response.status === 409 ? options.conflictMessage || 'Esse e-mail já está cadastrado. Entre com sua senha.'
      : response.status === 401 ? 'Não foi possível autenticar. Confira seus dados ou entre novamente.'
        : response.status >= 500 ? 'Não foi possível concluir agora. Tente novamente.'
          : data?.message || 'Não foi possível concluir a solicitação.';
    throw new ApiError(message, response.status, data?.fieldErrors || {}, {
      code: data?.code, missingFields: data?.missingFields,
    });
  }
  return data;
}
