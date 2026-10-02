import { authenticatedFetch } from './apiClient';

export async function fetchFinancialInstitutions(path, { signal, accessToken } = {}) {
  const response = await authenticatedFetch(path, {
    method: 'GET',
    headers: { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    signal,
  }, accessToken);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Não foi possível acessar as instituições. A API exige autenticação.');
    }
    throw new Error('Não foi possível carregar as instituições. Tente novamente.');
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.some(item => !Number.isSafeInteger(item.id) || item.id <= 0 || typeof item.name !== 'string' || !item.name.trim() || typeof item.logoUrl !== 'string')) {
    throw new Error('A API retornou uma lista de instituições em formato inesperado.');
  }

  return data.map(({ id, name, logoUrl }) => ({ id, name: name.trim(), logoUrl }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
