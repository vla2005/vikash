// Reutiliza o formatador: alternar a privacidade atualiza muitos valores juntos.
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function parseCurrency(value) {
  const digits = String(value).replace(/\D/g, '');
  const sign = String(value).trim().startsWith('-') ? -1 : 1;
  return sign * Number(digits || 0) / 100;
}

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

export function maskCurrency(value) {
  return formatCurrency(parseCurrency(value));
}
