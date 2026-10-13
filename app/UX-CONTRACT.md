# Comportamento dos fluxos de exclusão

## Aparência global

## Política global de animação

A política do Vikash mantém todas as animações independentes de Reduzir movimento, por decisão explícita do usuário. `useReducedMotion` é o ponto compartilhado de compatibilidade e retorna sempre `false`, sem ler `AccessibilityInfo` ou `prefers-reduced-motion` e sem assinar mudanças do sistema. `AppMotionPolicy` fixa os defaults nativos do Reanimated com `ReducedMotionConfig / ReduceMotion.Never`; drawer, revisão de voz, toast, lente e compactação também passam `Never` explicitamente. A alternativa web não importa o motor nativo. Isso não modifica configurações do aparelho. Pausas em segundo plano, desmontagem, conteúdo oculto ou fim de captura continuam sendo regras do ciclo de vida, e Reduzir transparência continua independente.

A identidade prateada oferece modos claro e escuro em todas as telas, escolhidos por um único toggle “Tema escuro” no perfil. Não há opção Sistema. O padrão é escuro; a escolha clara/escura fica salva no aparelho, é restaurada antes de montar o conteúdo e continua a mesma ao trocar perfis. Valores antigos “system” ou inválidos usam o padrão escuro. Falha ao salvar mantém o tema atual e informa o erro. A troca não remonta telas nem descarta campos ou sessões. “Ajuda e suporte” foi removido do perfil. Os tokens canônicos são `silverThemes.light/dark` em `src/theme/silver.js`, entregues por `ThemeProvider` e `ThemeVariant`. Categorias e bancos conservam suas próprias cores. No claro, logo, texto, malha e ondas são escuros sobre branco; a luz é preta e suave do topo até perto da metade da tela. No escuro, continuam claros sobre preto. A luz tem intensidade 0,40 nos dois modos. Drawers, confirmações e toasts são opacos. Navegação clara usa lente e microfone escuros com símbolos brancos; header e teclado acompanham o tema.

| Capacidade | Responsável canônico | Verificação |
| --- | --- | --- |
| Identidade e luz | `ThemeProvider`, `ThemeVariant`, `silver.js`, `AmbientLight` | Exportações Android/iOS/web e inspeção visual |
| Vidro e navegação | `GlassMaterial`, `GlassDock`, `DockLayout`, `DockShade` | `glassDock.test.jsx`, `androidGlassMaterial.test.jsx`, `dockScroll.test.js`, inspeção sobre conteúdo colorido |
| Header transparente e espaço de rolagem | `FloatingAppHeader`, `HeaderBackdrop`, `useDockPadding`, `DockProvider` | `floatingHeader.test.jsx`, `mainTabs.test.jsx`, inspeção no início e após rolar |
| Voltar nas páginas | `GlassBackButton` | Testes de detalhes, perfil, formulários e recuperação |
| Toast opaco com anúncio e toque para fechar | `ToastContext`, `ToastContent`, `Toast` | `toast.test.jsx`, inspeção em 320 px |
| Contas e cartões separados | `AccountsScreen` | `mainTabs.test.jsx` |
| Drawers e confirmações opacos | `DrawerModal`, `DrawerPanel`, `useDrawerAnimation`, `ConfirmationDialog`, `colors.dialogSurface` | `drawerMotion.test.jsx`, `drawerMotionWeb.test.jsx`, `voiceDrawer.test.jsx`, `profileSwitcher.test.jsx`, `invoicePayment.test.jsx`, inspeção de filtros, seletores e confirmação |
| Exclusão por arraste | `SwipeableRow` | `categoryDeletion.test.jsx`, `transactionDeletion.test.jsx`, inspeção de abertura e retorno parcial no extrato |
| Escuta em tela inteira e revisão | `VoiceDrawer`, `VoiceScene`, `VoiceMicGlyph`, `useVoiceReviewProgress`, `DrawerPanel`, `VoiceMicButton`, `VoiceMicPulse`, `VoiceMicGlow`, `ListeningOrb`, `ListeningOrbSurface`, `ListeningWave`, `ListeningWaveSurface`, `voiceOrb` | `voiceScene.test.jsx`, `listeningOrb.test.jsx`, `listeningOrbWeb.test.jsx`, `voiceDrawer.test.jsx`, prévia com transcrição simulada |
| Pilha e lista comparativa de cartões | `HomeCreditCards`, `CreditCardSummary` | `dashboard.test.jsx`, `mainTabs.test.jsx` |

Detalhes recebem o UUID do cartão; “Ver fatura” recebe também o UUID da fatura selecionada. Os botões são alvos separados. A lista de cartões usa o conjunto já carregado pela API e mantém o scroller da tela. Nenhuma paginação, consulta ou regra financeira foi adicionada. O botão compactado ocupa 54 × 54 px e sua lente cobre a mesma área.

O toast substitui a notificação anterior, preserva seu tempo entre telas e não altera a rolagem. A confirmação compacta não substitui erros dentro de formulários e diálogos. A renderização web verifica o layout; o vidro nativo deve ser conferido em aparelhos.

A entrada dos drawers espera a primeira medição do painel e, no celular, o `onShow` do modal. Parte da altura completa do painel mais 24 px, sem deslocamento fixo de 180 px, e sobe em 300 ms com curva de sheet, sem mola. Montar o modal ou atualizar seu conteúdo não reinicia o movimento. O celular usa Reanimated na thread de UI; a web usa CSS depois de pintar o painel fora da tela. A saída conserva 260 ms e a curva cúbica anterior, mantendo o conteúdo até terminar. Reabrir durante a saída inverte o movimento sem reposicionar o painel; conclusões antigas são ignoradas. Reduzir movimento não altera os tempos de entrada/saída, e callbacks `onShow` dos fluxos são preservados.

A navegação usa a variante `navigation` de `GlassMaterial`: grafite mais claro e película mais densa que os cards, contorno definido, sombra suave e lente prateada com rótulo em negrito. No claro, a película é branca e a lente é escura. `DockShade` aplica a cor do fundo gradualmente sobre o conteúdo atrás da região inferior; fica fora da captura de blur e não intercepta gestos. A compactação conserva esse contraste sem alterar as áreas de toque ou a posição da lente. A variante padrão conserva o acabamento dos controles de voltar. Os valores pertencem a `dock` em `src/theme/silver.js`. O ajuste não adiciona blur por frame nem modifica regras de navegação, dados ou cartões.

Nas quatro abas principais, a logo e o avatar permanecem fixos sobre o conteúdo, com desfoque e queda suave até transparência na base, sem borda ou painel retangular. O espaço inicial do header é reservado dentro do scroller; o conteúdo passa por baixo ao rolar. O backdrop é renderizado depois da área capturada e fora dela, para não desfocar a própria logo. No Android, compartilha o alvo da navegação e usa uma única camada de blur com máscara estática. A área segura é respeitada. Ocultar o header em detalhes e formulários remove o blur e a reserva de espaço, mas conserva a instância da logo e do avatar. Reduzir transparência usa fundo opaco para preservar a leitura.

O drawer de voz ocupa a tela inteira, com fundo opaco, voltar no topo e regravar, microfone e fechar na base. A malha prateada muda de formato, as ondas abaixo dela se movem e o microfone pulsa com halo e dois anéis de luz apenas durante a captura ativa. Preparação, finalização e erro não indicam escuta. Por pedido explícito do usuário, todas as animações do app ignoram Reduzir movimento. Os loops terminam ao parar, fechar ou sair para segundo plano. Esfera e ondas são decorativas para tecnologias assistivas; o título, a transcrição e o estado selecionado do microfone informam a escuta. As ondas indicam captura ativa, sem representar uma medição do volume.

Tocar no microfone interrompe a captura. A transcrição sobe para ocupar a área da esfera e das ondas, que desaparecem com opacidade e escala. A revisão permanece no mesmo cenário, sem card, novo título grande ou fundo do editor. O texto completo fica editável sobre o fundo do tema, com lápis para focar a edição. O ícone central faz a transição do microfone para confirmação, com rotação, escala e opacidade. Regravar inverte a transição do cenário e do ícone, descarta a captura atual e ignora eventos atrasados dela. As transições são interrompíveis, mantêm seus movimentos mesmo com Reduzir movimento ligado e liberam seus recursos ao fechar.

A edição e o fim de textos longos ficam acessíveis por rolagem, com os controles fixos fora do scroller. Voltar ou fechar cancelam a captura sem enviar. O controle central da revisão confirma e analisa o texto editado; durante o envio, edição, regravação e fechamento ficam bloqueados. Falha mantém o texto e permite tentar novamente. Nenhuma requisição ou envio automático de áudio foi adicionado.

“Pergunte ao ViKash” usa o símbolo de estrela de IA e, ao tocar, mostra o toast informativo “Essa função estará disponível em breve.”, sem abrir tela, iniciar captura ou enviar requisições. O microfone circular separado continua abrindo o registro por voz. `MainTabs` controla os callbacks distintos, `DockLayout` os apresenta nas versões nativa e web e `ToastContext` é o responsável pelo aviso.

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
comportamento de foco, Escape e animação do componente canônico.

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


Falhas na análise por voz são exibidas dentro do drawer, abaixo da transcrição preservada, por `VoiceAnalysisFeedback`. A API entrega code, missingFields e fieldErrors. VOICE_INFORMATION_REQUIRED e VOICE_INPUT_INVALID usam o ícone amarelo e mostram rótulos legíveis com a orientação de cada campo; VOICE_ANALYSIS_UNAVAILABLE, rede e demais falhas técnicas usam ícone vermelho. HTTP 400/422 é apenas o fallback para a API antiga. Título, texto e superfície opaca continuam neutros nos dois temas. Corrigir o texto, regravar, reenviar ou reabrir limpa o aviso anterior. O drawer continua aberto no erro; o controle central permite confirmar novamente ou tentar novamente. Somente o sucesso do registro emite toast. Os campos mostrados são exclusivamente os apontados pela API, sem inferência ou enumeração de dados já preenchidos.
