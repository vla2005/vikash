# Comportamento dos fluxos de exclusão

Contrato do fluxo alterado de faturas; não representa uma auditoria de todas as telas.

| Capacidade | Responsável canônico | Verificação |
| --- | --- | --- |
| CRUD | `src/services/creditCards.js`, `CreditCardDetailsScreen` | `__tests__/creditCardDetails.test.jsx`, `creditCardsApi.test.js` |
| Confirmação | `src/components/ConfirmationDialog.jsx` | `__tests__/transactionDeletion.test.jsx`, `creditCardDetails.test.jsx` |
| Ação destrutiva | `src/components/DeleteActionButton.jsx` | Os mesmos testes de exclusão |
| Toast | `src/contexts/ToastContext.jsx`, `src/components/Toast.jsx` | `__tests__/toast.test.jsx` |

As regras da API estão em `../backend/README.md`, na seção “Excluir uma fatura
vazia”, e em `CreditCardInvoiceService.delete`. O servidor valida usuário e
vínculos; a indicação `deletable` orienta a apresentação e não substitui a validação.

O botão “Excluir fatura” aparece apenas com `deletable === true` e total zero.
Ao tocar, a confirmação informa o mês e que o saldo e o limite permanecem iguais.
Cancelar não envia requisição. Confirmar envia uma única requisição autenticada;
enquanto ela estiver pendente, cancelar ou confirmar novamente não altera o fluxo.

No sucesso, fechar a confirmação, mostrar “Fatura excluída.” e recarregar o cartão
e as listas relacionadas. Selecionar outra fatura disponível ou mostrar o estado
vazio, sem navegar para fora do cartão. No erro, preservar a fatura e exibir a
mensagem dentro da confirmação, permitindo cancelar ou tentar novamente.

O formato segue português brasileiro, datas do mês de referência e moeda BRL.
Controles têm nome acessível e semântica de botão; a confirmação reutiliza o
comportamento de foco, Escape e redução de movimento do componente canônico.
