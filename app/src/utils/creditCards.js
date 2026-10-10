export function isValidLastFourDigits(value) {
  return value === null || (Number.isInteger(value) && value >= 0 && value <= 9999);
}

export function formatLastFourDigits(value) {
  return value == null ? '' : String(value).padStart(4, '0');
}

export function creditCardLabel(card) {
  const digits = formatLastFourDigits(card?.lastFourDigits);
  return digits ? `Cartão final ${digits}` : 'Cartão sem final informado';
}
