/* global BigInt */
// Monetary form input is converted with decimal strings, never floating point.
export function brazilianMoney(value) {
  const text = String(value ?? '')
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '');
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.replace(/\./g, '').split(',');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents < 1n || cents > 999999999999999n) return null;
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}
export function editableMoney(value) {
  if (value == null) return '';
  const text = String(value);
  return /^\d+(?:\.\d{1,2})?$/.test(text) ? text.replace('.', ',') : '';
}
export function validEntryDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function entryFields(analysis) {
  return {
    description: analysis?.description || '',
    amount: editableMoney(analysis?.amount),
    type: analysis?.type || '',
    paymentMethod: analysis?.paymentMethod || '',
    date: analysis?.occurredAt?.slice(0, 10) || '',
    accountUuid: analysis?.accountUuid || '',
    creditCardUuid: analysis?.creditCardUuid || '',
    installmentCount: String(analysis?.installmentCount ?? ''),
    category: analysis?.customCategoryUuid
      ? `custom:${analysis.customCategoryUuid}`
      : analysis?.defaultCategoryName
      ? `default:${analysis.defaultCategoryName}`
      : '',
  };
}
export function reviewedAnalysis(fields, original) {
  const amount = brazilianMoney(fields.amount);
  if (!amount) throw new Error('Informe um valor válido, como 89,90.');
  if (!fields.description.trim() || fields.description.trim().length > 255)
    throw new Error('Informe a descrição, com até 255 caracteres.');
  if (!['INCOME', 'EXPENSE'].includes(fields.type))
    throw new Error('Escolha Receita ou Despesa.');
  if (
    ![
      'PIX',
      'CREDIT_CARD',
      'DEBIT_CARD',
      'BANK_SLIP',
      'CASH',
      'BANK_TRANSFER',
      'OTHER',
    ].includes(fields.paymentMethod)
  )
    throw new Error('Escolha a forma de pagamento.');
  if (!validEntryDate(fields.date))
    throw new Error('Informe uma data válida no formato AAAA-MM-DD.');
  const credit = fields.paymentMethod === 'CREDIT_CARD';
  if (credit && fields.type !== 'EXPENSE')
    throw new Error('Crédito é permitido somente para despesas.');
  if (!(credit ? fields.creditCardUuid : fields.accountUuid))
    throw new Error(credit ? 'Escolha o cartão.' : 'Escolha a conta.');
  if (!/^\d+$/.test(fields.installmentCount))
    throw new Error('Informe a quantidade de parcelas.');
  const installmentCount = Number(fields.installmentCount);
  if (
    installmentCount < 1 ||
    installmentCount > 120 ||
    (!credit && installmentCount !== 1)
  )
    throw new Error(
      'Use de 1 a 120 parcelas no crédito e 1 nos demais pagamentos.',
    );
  if (BigInt(amount.replace('.', '')) < BigInt(installmentCount))
    throw new Error('Cada parcela precisa ter pelo menos R$ 0,01.');
  const [kind, ...name] = fields.category.split(':');
  return {
    description: fields.description.trim(),
    amount,
    type: fields.type,
    paymentMethod: fields.paymentMethod,
    occurredAt: `${fields.date}T${
      original?.occurredAt?.slice(11) || '12:00:00'
    }`,
    accountUuid: credit ? null : fields.accountUuid,
    creditCardUuid: credit ? fields.creditCardUuid : null,
    destinationAccountUuid: null,
    defaultCategoryName: kind === 'default' ? name.join(':') : null,
    customCategoryUuid: kind === 'custom' ? name.join(':') : null,
    installmentCount,
    missingFields: [],
    creditCardInvoiceUuid: null,
  };
}
