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

## Troca de perfis

| Capacidade | Responsável canônico | Verificação |
| --- | --- | --- |
| Sessões e isolamento | `OnboardingContext`, `sessionStorage`, `secureStorage`, `apiClient` | `profileSessions.test.jsx`, `sessionStorage.test.js`, `refreshSession.test.jsx` |
| Seletor de perfil | `ProfileSwitcherDrawer`, `AppHeader` | `profileSwitcher.test.jsx`, `mainTabs.test.jsx` |
| Login adicional | `LoginScreen`, `AppNavigator`, `ProtectedScreen` | `onboarding.test.jsx`, `homeAuth.test.jsx` |
| Painel e confirmação | `DrawerPanel`, `ConfirmationDialog` | Testes do seletor e inspeção no navegador |

A origem das regras é a solicitação de manter sessões independentes no aparelho
e o contrato existente em `AuthService` (`me`, `refreshToken`, `logout`) e
`UserResponse.uuid`. O UUID autenticamente retornado pela API identifica o perfil;
a autorização financeira continua sendo responsabilidade do servidor.

O avatar abre “Seus perfis”. A seleção valida a sessão antes de abrir a Home do
perfil escolhido. Enquanto valida, os controles do drawer ficam bloqueados. Falha
de conexão mantém o perfil anterior e exibe erro no drawer. Sessão expirada abre
login com o e-mail daquele perfil; os demais continuam salvos. Adicionar conta
reutiliza o login e permite voltar sem encerrar a sessão atual.

Sair usa a confirmação compartilhada e cita o perfil afetado. Revogação recusada
ou falha de rede conserva a sessão; uma sessão já invalidada pode ser removida
localmente. Nenhum fluxo mistura saldo, contas, cartões, listas ou formulários de
usuários distintos. Troca e saída reiniciam a árvore protegida e cancelam pedidos
antigos. Renovação de token do mesmo perfil mantém a tela atual.
