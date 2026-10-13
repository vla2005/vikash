# Análise de lançamentos por voz

POST /api/transaction/create recebe a transcrição revisada em transcription e exige uma sessão autenticada. Sucesso continua sendo HTTP 201 sem corpo. O áudio não é enviado a esse endpoint.

## Informações ausentes, ambíguas ou inválidas

HTTP 400 preserva a compatibilidade existente. A resposta inclui code, missingFields e fieldErrors, além dos campos comuns timestamp, status, error, message e path. As orientações são geradas pelo backend, não pelo modelo.

Exemplo para "Gastei cinquenta reais na farmácia":

```json
{
  "status": 400,
  "code": "VOICE_INFORMATION_REQUIRED",
  "message": "Informe a forma de pagamento: Pix, débito, crédito, dinheiro, boleto ou transferência bancária. Informe a conta ou banco utilizado. Se houver mais de uma conta no banco, diga qual delas.",
  "missingFields": ["paymentMethod", "accountUuid"],
  "fieldErrors": {
    "paymentMethod": "Informe a forma de pagamento: Pix, débito, crédito, dinheiro, boleto ou transferência bancária.",
    "accountUuid": "Informe a conta ou banco utilizado. Se houver mais de uma conta no banco, diga qual delas."
  }
}
```

- VOICE_INFORMATION_REQUIRED: dados ausentes ou que precisam de desambiguação.
- VOICE_INPUT_INVALID: vários lançamentos na mesma fala ou pagamento parcial de fatura, ainda não suportado. Os marcadores dessas condições também constam em missingFields.
- VOICE_ANALYSIS_UNAVAILABLE: HTTP 503 para falha do provedor, resposta inválida/incompleta ou schema inconsistente. Sem missingFields; mensagem pública sem detalhes internos.
- Erros de domínio já existentes mantêm seu contrato. A ausência de code identifica uma resposta legada; o frontend usa o status como fallback.

Campos e marcadores aceitos: description, amount, type, paymentMethod, accountUuid, creditCardUuid, destinationAccountUuid, creditCardInvoiceUuid, occurredAt, installmentCount, multipleTransactions, partialInvoicePayment.

accountUuid é a conta selecionada por instituição/descrição: não existe um campo bancário separado que o app precise enviar. Banco e método de pagamento são informações diferentes. Compras no crédito pedem creditCardUuid; transferências próprias pedem origem e destinationAccountUuid; faturas pedem conta pagadora, cartão e creditCardInvoiceUuid. Valor e descrição podem ser nulos no pagamento integral de fatura. Categoria é opcional e data/hora ausentes são resolvidas pelo contexto.

O backend agrega campos obrigatórios nulos mesmo quando o Gemini retorna missingFields vazio. A análise é validada antes de persistir, com as validações atuais de propriedade, valores, parcelas e saldos preservadas. Um nome de campo desconhecido retornado pelo modelo é falha técnica, não é ignorado.

## Prompt e validação

O prompt está em src/main/resources/prompts/transaction-analysis.txt. Regras e exemplos cobrem falta de banco/método, múltiplas contas/cartões da mesma instituição, números por extenso, correções da fala, parcelas, pagamentos de fatura e transferências a terceiros. Não escolher a única conta por mera disponibilidade, não inventar UUIDs e enumerar todos os problemas são requisitos explícitos. O schema limita missingFields a um enum.

Referências: [orientações oficiais de prompts do Gemini](https://ai.google.dev/gemini-api/docs/prompting-strategies) e [saídas estruturadas](https://ai.google.dev/gemini-api/docs/structured-output).

Testes usam um Gemini simulado e bancos H2 de teste. Eles validam contrato, transporte, tratamento de erros e ausência de gravações em caso de falha; não medem a qualidade semântica do Gemini real. Para avaliar essa qualidade, use falas sintéticas em um ambiente separado, com contas/cartões sintéticos e sem registrar dados reais.
