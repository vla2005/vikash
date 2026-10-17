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
| Assistente, anexos e histórico | `AssistantExperience`, `AssistantComposer`, `useAssistant`, `assistantStorage`, `assistantApi`, `ASSISTANT.md` | `assistant.test.jsx`, `assistantApi.test.js`, `assistantStorage.test.js`, prévia web e aparelhos físicos |
| Pilha e lista comparativa de cartões | `HomeCreditCards`, `CreditCardSummary` | `dashboard.test.jsx`, `mainTabs.test.jsx` |

Detalhes recebem o UUID do cartão; “Ver fatura” recebe também o UUID da fatura selecionada. Os botões são alvos separados. A lista de cartões usa o conjunto já carregado pela API e mantém o scroller da tela. Nenhuma paginação, consulta ou regra financeira foi adicionada. O botão compactado ocupa 54 × 54 px e sua lente cobre a mesma área.

O toast substitui a notificação anterior, preserva seu tempo entre telas e não altera a rolagem. A confirmação compacta não substitui erros dentro de formulários e diálogos. A renderização web verifica o layout; o vidro nativo deve ser conferido em aparelhos.

A entrada dos drawers espera a primeira medição do painel e, no celular, o `onShow` do modal. Parte da altura completa do painel mais 24 px, sem deslocamento fixo de 180 px, e sobe em 300 ms com curva de sheet, sem mola. Montar o modal ou atualizar seu conteúdo não reinicia o movimento. O celular usa Reanimated na thread de UI; a web usa CSS depois de pintar o painel fora da tela. A saída conserva 260 ms e a curva cúbica anterior, mantendo o conteúdo até terminar. Reabrir durante a saída inverte o movimento sem reposicionar o painel; conclusões antigas são ignoradas. Reduzir movimento não altera os tempos de entrada/saída, e callbacks `onShow` dos fluxos são preservados.

A navegação usa a variante `navigation` de `GlassMaterial`: grafite mais claro e película mais densa que os cards, contorno definido, sombra suave e lente prateada com rótulo em negrito. No claro, a película é branca e a lente é escura. `DockShade` aplica a cor do fundo gradualmente sobre o conteúdo atrás da região inferior; fica fora da captura de blur e não intercepta gestos. A compactação conserva esse contraste sem alterar as áreas de toque ou a posição da lente. A variante padrão conserva o acabamento dos controles de voltar. Os valores pertencem a `dock` em `src/theme/silver.js`. O ajuste não adiciona blur por frame nem modifica regras de navegação, dados ou cartões.

Nas quatro abas principais, a logo e o avatar permanecem fixos sobre o conteúdo, com desfoque e queda suave até transparência na base, sem borda ou painel retangular. O espaço inicial do header é reservado dentro do scroller; o conteúdo passa por baixo ao rolar. O backdrop é renderizado depois da área capturada e fora dela, para não desfocar a própria logo. No Android, compartilha o alvo da navegação e usa uma única camada de blur com máscara estática. A área segura é respeitada. Ocultar o header em detalhes e formulários remove o blur e a reserva de espaço, mas conserva a instância da logo e do avatar. Reduzir transparência usa fundo opaco para preservar a leitura.

O drawer de voz ocupa a tela inteira, com fundo opaco, voltar no topo e regravar, microfone e fechar na base. A malha prateada muda de formato, as ondas abaixo dela se movem e o microfone pulsa com halo e dois anéis de luz apenas durante a captura ativa. Preparação, finalização e erro não indicam escuta. Por pedido explícito do usuário, todas as animações do app ignoram Reduzir movimento. Os loops terminam ao parar, fechar ou sair para segundo plano. Esfera e ondas são decorativas para tecnologias assistivas; o título, a transcrição e o estado selecionado do microfone informam a escuta. As ondas indicam captura ativa, sem representar uma medição do volume.

Tocar no microfone interrompe a captura. A transcrição sobe para ocupar a área da esfera e das ondas, que desaparecem com opacidade e escala. A revisão permanece no mesmo cenário, sem card, novo título grande ou fundo do editor. O texto completo fica editável sobre o fundo do tema, com lápis para focar a edição. O ícone central faz a transição do microfone para confirmação, com rotação, escala e opacidade. Regravar inverte a transição do cenário e do ícone, descarta a captura atual e ignora eventos atrasados dela. As transições são interrompíveis, mantêm seus movimentos mesmo com Reduzir movimento ligado e liberam seus recursos ao fechar.

A edição e o fim de textos longos ficam acessíveis por rolagem, com os controles fixos fora do scroller. Voltar ou fechar cancelam a captura sem enviar. O controle central da revisão confirma e analisa o texto editado; durante o envio, edição, regravação e fechamento ficam bloqueados. Falha mantém o texto e permite tentar novamente. Nenhuma requisição ou envio automático de áudio foi adicionado.

“Pergunte ao ViKash” abre AssistantExperience com o mesmo Animated Input Bar usado no registro de transação, fundo desfocado e bordas do Apple Intelligence do Reacticx. Enviar abre o chat preto, com perguntas em balões à direita e respostas à esquerda sem balão. Histórico e anexos são locais e separados por perfil; ausência de endpoint não simula resposta. O microfone separado continua abrindo somente o registro de transação. Contrato e limites estão em ASSISTANT.md.

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


## Registro por voz ou texto

| Capacidade | Responsável canônico | Verificação |
| --- | --- | --- |
| Entrada e confirmação | VoiceDrawer, VoiceComposer, VoiceComposerLayout | voiceDrawer.test.jsx, voiceComposer.test.jsx |
| Input animado | Reacticx animated-input-bar | animatedInputBar.test.jsx, inspeção web clara/escura |
| Análise e criação | MainTabs.confirmTranscription, services/transactions.createTransaction | mainTabs.test.jsx, transactionsApi.test.js |
| Avisos e recuperação | VoiceAnalysisFeedback, utils/voiceAnalysisFeedback | voiceDrawer.test.jsx, voiceAnalysisFeedback.test.jsx |

O drawer oferece fala e digitação no mesmo cenário, sem abas. O pequeno botão de teclado abaixo do microfone se expande no próprio campo de vidro e sobe, enquanto os controles laterais desaparecem em fade e o próprio microfone desce e diminui de 72 para 44 px, permanecendo abaixo do campo. Tocar nesse microfone recolhe e desce o input até o botão de teclado; o microfone sobe e cresce, trazendo regravar e fechar em escala e opacidade. O ícone de teclado dentro do campo apenas devolve foco à edição. A instância do contêiner, do campo já aberto e do orbe permanece durante a alternância. O foco só é solicitado ao concluir a expansão e somente se o drawer continuar visível em digitação e em primeiro plano.

A entrada padrão por voz mantém a captura existente; expandir o campo cancela o serviço, o relógio e o temporizador de finalização, ignorando callbacks antigos. Fechar limpa o modo, rascunho, transcrição, aviso, relógio e estado de envio; cada nova abertura começa pela voz. O rascunho permanece apenas ao recolher e expandir durante a mesma abertura. Respostas atrasadas de uma análise encerrada não fecham nem alteram um novo registro. Voltar ao microfone inicia uma captura nova. O orbe continua animado com opacidade reduzida ao digitar, enquanto as ondas ficam paradas sem captura.

Digitar não envia automaticamente: o usuário revisa no campo e toca na seta de envio, rotulada Confirmar e analisar. O campo cresce até 128 px e permite rolar textos longos; os controles permanecem fora da rolagem. Texto vazio ou só com espaços não habilita confirmação. O envio remove espaços externos e utiliza o mesmo contrato da análise de voz; não há mudança de endpoint nem de autorização. Enquanto aguarda, entrada, modos e fechamento ficam bloqueados, e cliques repetidos não criam pedidos extras.

Sucesso reutiliza atualização e toast do fluxo existente. Falha mantém o drawer e o texto: informações faltantes usam aviso amarelo com os campos apontados pela API; indisponibilidade ou outra falha técnica usa vermelho. Corrigir texto devolve foco ao campo e editar limpa o aviso. A mensagem de preservação usa “Seu texto foi preservado.” no modo digitado. No Android e iOS, tocar fora do campo recolhe o teclado sem fechar o drawer, limpar o rascunho, mudar o modo ou enviar. Os controles mantêm o primeiro toque e os inputs preservam edição/seleção. VoiceKeyboardArea aplica KeyboardAvoidingView com height no Android e padding no iOS, mantendo o composer acima do teclado sem somar manualmente altura do IME/insets. As rolagens de revisão/feedback também recolhem o teclado ao arrastar. O toque externo é observado na fase de captura e sempre devolve false, sem disputar o responder com as camadas internas. As referências nativas preservam toda a área do campo de vidro e os TextInputs; fora dela, ambos perdem foco explicitamente e Keyboard.dismiss é chamado. Tocar fora também invalida o foco automático pendente da expansão. O ícone de teclado pode solicitar foco novamente, separado da conclusão da animação. A web conserva seu caminho de foco atual. Os testes voiceKeyboard exercitam captura sem grant/release no fundo, toques internos, foco atrasado, abertura/fechamento do teclado e ambas as ordens de redimensionamento Android; a conferência com o teclado nos aparelhos físicos continua necessária. O layout mantém a ação acessível com teclado/altura reduzida; verificação web usou respostas simuladas, sem capturar áudio nem gravar transações reais. Validação física do teclado Android/iOS ainda precisa ser feita no aparelho.


## Gastos por categoria no dashboard

O componente canônico é CategoryExpensesChart, apresentado por DashboardExpensesChart, com CategoryDonut e o PieChart copiado do Reacticx (Root/Slices). O contrato de dados é o dashboard existente de contas/crédito; seleção não consulta endpoint nem altera os totais recebidos.

O estado padrão mostra o total do mês no canto superior esquerdo, o período abaixo e “do mês / 100%” no centro da rosca. Tocar numa fatia desloca e destaca a categoria, atenua as outras fatias, realça a legenda correspondente e mostra seu valor/nome no topo e participação no centro. A seleção permanece depois do toque. Legendas são botões com nome acessível, montante, percentual e estado selected, fornecendo alternativa ao toque preciso no gráfico. Tocar na mesma categoria ou no centro remove a seleção; qualquer nova categoria substitui a anterior. Gestos de rolagem continuam pertencendo ao scroller.

Mudar mês/escopo, ocultar valores, receber erro/carregamento ou remover a categoria selecionada limpa a seleção. Atualizar valores da mesma categoria conserva sua identidade quando válida. O escopo Contas/Crédito continua com seu comportamento existente. Ocultar mascara montantes e percentuais, desabilita seleção e fornece data vazio ao renderer, inclusive na web; mostrar novamente começa no total. Não há contagem animada de dígitos nem blur novo.

Os testes categoryPieSelection, dashboard e reacticxIntegration cobrem toque por coordenadas, legenda, desmarcação, borda deslocada, período/escopo, privacidade, paginação e mola/cleanup. A prévia usa dados fictícios e respostas locais; medição de fluidez em aparelhos não é inferida da inspeção web.

A legenda mostra até cinco categorias por página, ordenadas pelo gasto, sem agrupar as demais em Outros. A rosca conserva todas as categorias e o total integral. Mais de cinco habilita arraste horizontal com encaixe por página e pontinhos pequenos abaixo; tocar um ponto oferece a mesma navegação com rótulo e estado acessíveis. O ativo é branco no escuro/preto no claro; os demais são cinza. Não há pontos para uma única página. A última página incompleta conserva a altura de cinco linhas; nomes longos têm duas linhas e nome completo no rótulo acessível. Páginas fora de vista não recebem foco nem são lidas pelo leitor de tela.

Selecionar uma fatia navega suavemente à página da respectiva legenda. Arrastar ou tocar num ponto não altera seleção, valor do topo, centro nem dados/animação da rosca. Mudar mês/escopo ou privacidade reinicia na primeira página; rotação conserva e realinha a página atual. Reduzir a quantidade de categorias limita a página à última válida. Rolagem horizontal e encaixe são nativos, sem atualizar React por frame; o scroller vertical do dashboard conserva seu gesto. Testes cobrem páginas parciais, seleção fora da página, privacidade, fonte ampliada, temas e atualização dos dados; fluidez física depende de verificação Android/iOS.


Na subaba Cartões de AccountsScreen, HomeCreditCards usa a variante scrollable, com ScrollableCreditCardStack no mesmo espaço da pilha original. A área tem altura constante, recorte próprio e rolagem vertical nativa, sem indicador. Todos os cartões já carregados podem ser percorridos; sua escala responde à profundidade. Títulos, indicadores, instrução, painel de fatura/limite e a lista comparativa permanecem fora desse scroller e conservam o layout. O dashboard mantém sua variante anterior.

Os gradientes de cima e de baixo reutilizam header-shade.png, com intensidade própria por tema, e aparecem apenas quando há conteúdo naquela direção. Não interceptam o toque. CardStackMotion usa shared values e worklets de Reanimated na UI nativa; a web tem adaptador Animated sem importar Worklets e contém encadeamento com overscrollBehaviorY: contain. Não há estado React por quadro nem novos pacotes.

O toque/arraste/inércia na pilha bloqueia temporariamente o scroller externo e o pull-to-refresh Android. Fim do gesto, cancelamento, desmontagem e segundo plano liberam o bloqueio; cancelar o toque de um Pressable durante um arraste não libera a página antes do fim desse arraste. Rolar não seleciona automaticamente. Tocar num cartão atualiza os dados existentes e alinha somente a pilha; os indicadores continuam sendo alternativa ao gesto, inclusive ao voltar ao cartão já selecionado. Detalhes e Ver fatura conservam os UUIDs e os callbacks anteriores. Sem overflow, não há sombra direcional; com um único cartão, a rolagem interna fica desabilitada.

Ao selecionar um cartão ou seu indicador na aba Cartões, ele passa à frente e fica maior que os demais com transição animada. A página mantém sua posição ao selecionar; somente a pilha e suas informações são atualizadas. A navegação vertical dentro da pilha continua contida e não move a página. Repetir o toque no cartão/indicador ativo restaura apenas o enquadramento interno da pilha. Não altera seleção por rolagem nem abre fatura automaticamente.

Dashboard e aba Cartões compartilham HomeCreditCards com scrollable, ScrollableCreditCardStack e CardStackMotion. HomeAccountsAndCards apenas encaminha o callback de interação; HomeScreen bloqueia seu scroll externo enquanto há gesto na pilha. Hierarquia, fades, seleção animada, informações e contenção são do mesmo componente, sem cópia de código e sem rolagem automática da página ao selecionar. Ocultar valores e ações de fatura continuam preservados.

Assistente: useAssistant controla envio/cancelamento/retry e histórico. assistantStorage é o adaptador nativo/web por perfil; assistantApi usa o cliente autenticado existente e um caminho relativo configurável. AssistantComposer reutiliza Animated Input Bar; AssistantIntelligence adapta o componente Reacticx com captura única, compilação tardia e pausa fora de uso. Limites: 5 anexos, 10 MiB por arquivo, 20 MiB por mensagem. Exclusão requer ConfirmationDialog; falhas mantêm os dados. Não há respostas fictícias no app.


Assistente — teclado e retorno ao dock: a estrela e a mensagem inicial permanecem montadas com o teclado aberto. A mensagem conserva a posição e a tipografia definidas ao abrir; somente o compositor se aproxima dela em 280 ms ao receber foco; em alturas extremas, somente a mensagem pode rolar internamente. O compositor continua acima do teclado. Fechar mede o compositor e usa a posição real do botão do dock salva antes da abertura: o vidro encolhe, se desloca e revela o rótulo compartilhado em 560 ms, enquanto mensagem, borda e desfoque desaparecem. O botão original permanece visível até o primeiro layout do vidro animado e reaparece ao terminar o retorno, sem lacuna entre superfícies. Reanimated executa a transição nativa na UI; a web usa Web Animations/CSS, sem atualização React por quadro nem dependências novas. Fechamento repetido é ignorado; foco pendente e trabalho assíncrono são interrompidos ao iniciar a saída.

Validação desta interação: 667 testes em 89 suítes passaram; lint sem erros (um aviso anterior em StatementFilters), build Vite e exportações Expo Android/iOS/web concluídos. Testes cobrem mensagem com teclado nos dois SOs, espera pela conclusão da saída, cancelamento de foco e medidas do dock. Prévia web confirmou a transformação intermediária e o layout com altura reduzida. Teclado real e fluidez em aparelhos físicos ainda exigem conferência.


Ao abrir Pergunte ao ViKash, o botão se transforma no compositor; não há troca instantânea de superfície. O frame e o compositor são medidos após a apresentação, preservando a origem real do dock, inclusive recolhido. Foco e teclado aguardam o fim da expansão e a leitura inicial do histórico. Fechar durante a expansão usa a posição atual do vidro, interrompe o foco e invalida medidas pendentes. A conclusão antiga da entrada não pode disparar o fechamento.


O aviso keyboardDidShow não inicia uma segunda compactação/reposição da mensagem. Foco move o compositor até a mensagem ancorada, limitado pelo espaço acima do teclado; fechar congela esse movimento. A geometria de saída usa a altura integral preservada antes do teclado. A passagem entre botão real e vidro só oculta o botão após o layout do substituto. Medidas de abertura atrasadas são invalidadas no fechamento.


Captura decorativa do assistente: assistantCapture.android.js é o proprietário da captura Android; assistantCapture.js mantém a captura iOS. O Android transfere PNG sem perda limitado ao buffer desfocado e usa raster Skia; não armazena capturas nem reaproveita imagens de outra tela/perfil. APKs sem módulo nativo mantêm a captura existente. Blur de reserva pode ser adiado somente enquanto a camada está invisível. Nenhuma otimização pode alterar a origem/destino do dock, os tempos de morph, a safe area, o toque fora do input ou a sequência iOS. Erros de captura continuam sem bloquear o chat.


## Respostas financeiras no chat

O proprietário de apresentação é `AssistantRichAnswer`, consumindo somente `reply.presentation` validada por `assistantPresentation` e salva por `useAssistant`/`assistantStorage`. A API e seu contrato estão em `../backend/ASSISTANT.md`. Respostas mantêm o fundo preto, alinhamento à esquerda sem balão e acento âmbar de `silver.js`. Valores legíveis usam a formatação exata da API, inclusive sinais, nulos e limites do resultado. Pizza e barras são do Reacticx; a legenda permite a mesma seleção sem exigir gestos no canvas, com estado selecionado acessível. Listas/legendas mostram cinco itens por página sem descartar o restante. Gráficos inadequados viram lista; versão desconhecida/corrompida usa o texto. A nota de origem informa a consulta dos registros do ViKash, sem alegar Open Finance ou atualização bancária. Logos usam apenas assets locais reconhecidos. Nenhum gráfico roda trabalho contínuo na thread JavaScript. Verificação: `assistantPresentation.test.jsx`, `assistantApi.test.js`, `assistant.test.jsx`, `assistantStorage.test.js` e os testes de apresentação/HTTP/Gemini no backend.


### Resposta progressiva do assistente

`AssistantThinking` reutiliza `Skeleton`/`SkeletonGroup`: três linhas no lugar da
mensagem, com uma única pulsação de opacidade no Reanimated, sem blur, reflexos,
sombras, animação de dimensões ou loops JavaScript. A pulsação para fora de uso.
`AssistantReplyText` revela somente a resposta recém-recebida em blocos rápidos,
com ticks locais de 40 ms e duração limitada a 1,8 s; atrasos saltam ao progresso
correto, sem acumular callbacks. Não há um componente por letra. O estado de
digitação é efêmero em `useAssistant`, separado do texto completo e dos gráficos
validados, que são salvos integralmente. Histórico/reabertura não repetem a
digitação. Sair da conversa ou entrar em segundo plano encerra a revelação.
`useAssistantAutoScroll` acompanha o fim em no máximo dez atualizações por segundo,
sem animações de scroll concorrentes, e respeita o leitor que rolou para cima.
Essa é uma apresentação progressiva da resposta já validada, não streaming da API.
O catálogo Reacticx foi consultado: o Animated Text com blur e nó por caractere foi
descartado para este texto longo. Nenhuma dependência foi adicionada. A política
permanente de movimento do app permanece em vigor.
