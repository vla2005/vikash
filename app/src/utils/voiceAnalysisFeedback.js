const fieldLabels = {
  description: 'Descrição', amount: 'Valor', type: 'Tipo do lançamento',
  paymentMethod: 'Forma de pagamento', accountUuid: 'Conta ou banco',
  creditCardUuid: 'Cartão', destinationAccountUuid: 'Conta de destino',
  creditCardInvoiceUuid: 'Fatura', occurredAt: 'Data e hora',
  installmentCount: 'Parcelas', multipleTransactions: 'Mais de um lançamento',
  partialInvoicePayment: 'Pagamento parcial de fatura',
};

export default function voiceAnalysisFeedback(failure) {
  const validationCodes = ['VOICE_INFORMATION_REQUIRED', 'VOICE_INPUT_INVALID'];
  // O código explícito prevalece; mantém compatibilidade com a API anterior.
  const validationStatus = failure?.status === 400 || failure?.status === 422;
  const warning = validationStatus && (!failure?.code || validationCodes.includes(failure.code));
  const fields = warning && Array.isArray(failure?.missingFields)
    ? [...new Set(failure.missingFields)].filter(field => Object.prototype.hasOwnProperty.call(fieldLabels, field)) : [];
  const details = fields.map(field => ({
    field, label: fieldLabels[field],
    message: typeof failure.fieldErrors?.[field] === 'string' ? failure.fieldErrors[field] : undefined,
  }));
  return {
    type: warning ? 'warn' : 'error',
    title: warning ? 'Confira as informações' : 'Não foi possível analisar',
    message: details.length ? 'Complete ou corrija as informações abaixo e confirme novamente.'
      : failure?.message || (warning
        ? 'Revise a transcrição e complete as informações do lançamento.' : 'Tente novamente em instantes.'),
    details,
  };
}
