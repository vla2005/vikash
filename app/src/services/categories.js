import { authenticatedFetch, postJson, putJson } from './apiClient';

export async function fetchCategories(accessToken, signal) {
  const response = await authenticatedFetch('/api/category', {
    method: 'GET',
    headers: { Accept: 'application/json', access_token: accessToken, Authorization: `Bearer ${accessToken}` }, signal,
  }, accessToken);
  if (!response.ok) { throw new Error('Não foi possível carregar as categorias. Tente novamente.'); }
  const data = await response.json();
  if (!data || !['defaultCategories', 'customCategories'].every(key => Array.isArray(data[key]) && data[key].every(item => item && ['name', 'icon', 'color'].every(field => typeof item[field] === 'string')))) {
    throw new Error('A API retornou as categorias em formato inesperado.');
  }
  return data;
}

export async function createCategory(values, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de criar uma categoria.'); }
  await postJson('/api/category/create', {
    name: values.name.trim(), icon: values.icon, color: values.color,
  }, accessToken, {
    headers: { access_token: accessToken },
    conflictMessage: 'Já existe uma categoria com esse nome.',
  });
}

export async function updateCategory(uuid, values, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de editar uma categoria.'); }
  if (typeof uuid !== 'string' || !uuid.trim()) { throw new Error('A categoria não tem UUID. Atualize a listagem antes de editar.'); }
  await putJson(`/api/category/update/${encodeURIComponent(uuid)}`, {
    name: values.name.trim(), icon: values.icon, color: values.color,
  }, accessToken, {
    headers: { access_token: accessToken },
    conflictMessage: 'Já existe uma categoria com esse nome.',
  });
}
