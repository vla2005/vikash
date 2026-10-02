export function parseCurrency(value) {
  const digits = String(value).replace(/\D/g, '');
  return Number(digits || 0) / 100;
}

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function maskCurrency(value) {
  return formatCurrency(parseCurrency(value));
}
