# Comportamento dos fluxos de exclusão

## Aparência global

| Capacidade | Responsável canônico | Verificação |
| --- | --- | --- |
| Resolver Sistema/Claro/Escuro e atualizar a interface | `ThemeContext`, `src/theme/index.js` | `appearance.test.jsx` |
| Salvar escolha independente do perfil | `appearanceStorage`, `appearanceStorage.web` | `appearanceStorage.test.js` |
| Escolher tema no perfil, com seleção e erro acessíveis | `AppearanceSettings`, `ProfileScreen` | `appearance.test.jsx`, capturas locais dos dois temas |
| Cores de categorias e campos | `categoryPalette`, `useInputTheme` | Contraste, identidade das chaves e preservação do formulário em `appearance.test.jsx` |
| Navegação, barra de status, fundo nativo e browser | `App`, `AppNavigator`, `ThemeBrowserSync` | Exportação Android/iOS, introspecção Expo, revisão React Native Web |

Sem preferência salva, seguir o sistema. Restaurar a preferência antes de
mostrar o conteúdo. Aplicar a escolha após persistir; em falha, manter o tema
atual e mostrar erro com possibilidade de nova tentativa. Trocar o tema não
remonta rotas ou formulários, e trocar o perfil não altera a aparência.

A preferência usa a chave `vikash.appearance`, fora do armazenamento das
sessões. O controle exibe três opções nomeadas e uma marca de seleção; não
depende somente da cor. Os tokens claros e escuros mantêm significado:
positivo, negativo, aviso e destrutivo. Cartões e logos dos bancos mantêm suas
cores de marca. Dados, chaves das categorias e regras financeiras permanecem
os mesmos.

As capturas em `.impeccable/review/appearance/` validam a interface web com
dados sintéticos; não substituem a conferência em Android/iOS após gerar os
novos binários com o módulo e a configuração nativa de aparência.

## Exclusão de faturas

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
