import voiceAnalysisFeedback from '../src/utils/voiceAnalysisFeedback';
test('gera orientações apenas para os campos que a API apontou, sem duplicar', () => {
  const result = voiceAnalysisFeedback({ status: 400, code: 'VOICE_INFORMATION_REQUIRED', missingFields: ['paymentMethod', 'accountUuid', 'paymentMethod'],
    fieldErrors: { paymentMethod: 'Informe a forma de pagamento.', accountUuid: 'Informe a conta ou banco.' } });
  expect(result.type).toBe('warn');
  expect(result.details).toEqual([{ field: 'paymentMethod', label: 'Forma de pagamento', message: 'Informe a forma de pagamento.' },
    { field: 'accountUuid', label: 'Conta ou banco', message: 'Informe a conta ou banco.' }]);
});
test('código técnico prevalece sobre HTTP 400 e ignora campos de um erro de servidor', () => {
  expect(voiceAnalysisFeedback({ status: 400, code: 'VOICE_ANALYSIS_UNAVAILABLE', missingFields: ['accountUuid'] })).toMatchObject({ type: 'error', details: [] });
});
test('validação do tipo não suportado é aviso, mas campos desconhecidos nunca viram rótulos brutos', () => {
  const result = voiceAnalysisFeedback({ status: 400, code: 'VOICE_INPUT_INVALID', missingFields: ['multipleTransactions', 'untrustedField', '__proto__'], fieldErrors: {} });
  expect(result.type).toBe('warn');
  expect(result.details).toEqual([{ field: 'multipleTransactions', label: 'Mais de um lançamento', message: undefined }]);
});
test('resposta antiga sem campos mantém a mensagem de compatibilidade', () => {
  expect(voiceAnalysisFeedback({ status: 400, message: 'Informe a conta.' })).toMatchObject({ type: 'warn', message: 'Informe a conta.', details: [] });
});

test('HTTP de falha técnica nunca fica amarelo mesmo com código de validação inconsistente', () => {
  for (const status of [401, 403, 404, 408, 429, 500, 503]) {
    expect(voiceAnalysisFeedback({ status, code: 'VOICE_INFORMATION_REQUIRED', missingFields: ['accountUuid'] }))
      .toMatchObject({ type: 'error', details: [] });
  }
});
