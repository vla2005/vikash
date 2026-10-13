# Interface prateada e navegação de vidro

O app oferece claro e escuro pela mesma identidade: branco e carvão com luz preta no claro; preto e grafite com luz prateada no escuro. A luz difusa parte do topo e permanece perceptível até perto da metade da tela, com queda suave até o fundo. Categorias e instituições conservam suas cores. As faces e a animação dos cartões sobrepostos foram preservadas.

## Política global de animação

A política do Vikash mantém todas as animações independentes de Reduzir movimento, por decisão explícita do usuário. `useReducedMotion` é o ponto compartilhado de compatibilidade e retorna sempre `false`, sem ler `AccessibilityInfo` ou `prefers-reduced-motion` e sem assinar mudanças do sistema. `AppMotionPolicy` fixa os defaults nativos do Reanimated com `ReducedMotionConfig / ReduceMotion.Never`; drawer, revisão de voz, toast, lente e compactação também passam `Never` explicitamente. A alternativa web não importa o motor nativo. Isso não modifica configurações do aparelho. Pausas em segundo plano, desmontagem, conteúdo oculto ou fim de captura continuam sendo regras do ciclo de vida, e Reduzir transparência continua independente.

## Ajustar a identidade

A configuração fica em `src/theme/silver.js`, em `silverThemes.light/dark.colors` e `.effects`, consultados por `useTheme` e `useThemeTokens`. Os tokens geométricos compartilhados continuam disponíveis como exportações; as cores e os materiais da interface vêm do tema ativo. `ThemeVariant` acompanha o esquema ativo e nunca força escuro.

A identidade prateada oferece modos claro e escuro em todas as telas, escolhidos por um único toggle “Tema escuro” no perfil. Não há opção Sistema. O padrão é escuro; a escolha clara/escura fica salva no aparelho, é restaurada antes de montar o conteúdo e continua a mesma ao trocar perfis. Valores antigos “system” ou inválidos usam o padrão escuro. Falha ao salvar mantém o tema atual e informa o erro. A troca não remonta telas nem descarta campos ou sessões. “Ajuda e suporte” foi removido do perfil.

Tokens de efeitos por tema:

- `ambientLight.colors`: as duas cores da luz;
- `ambientLight.intensity`: opacidade máxima, atualmente 0,40 nos dois temas;
- `ambientLight.height`: área superior que contém a luz, 660 px;
- `fields` e `fadeStart`: posição, tamanho e queda suave dos focos;
- `duration`, `driftX`, `driftY`, `scale`: percurso lento dos dois focos, com ritmos diferentes;
- `overscan`: margem extra que mantém o recorte dos focos fora da tela durante o movimento;
- `edgeFade`: queda fixa nas laterais, no topo e na base, até a cor exata do fundo;
- `glass`: película dos cards em cada tema, bordas e reflexos;
- `silverThemes[scheme].colors.dialogSurface`: fundo opaco dos drawers e popups de confirmação;
- `dock`: desfoque, acabamento e limiares da navegação.
- `toast`: superfície opaca e texto neutros; somente o indicador de tipo recebe verde (success), azul (info), amarelo (warn) ou vermelho (error), com contraste adaptado ao tema.
- `header`: altura, espaçamento, película, intensidade do desfoque e início da queda até transparente.
- `voiceOrb`: cor, intensidade do halo, tamanho, deformação e duração da esfera de escuta; `wave` concentra altura, cor e duração das ondas; `transition.duration` controla a troca entre escuta e revisão; `control` concentra tamanho, gradiente prateado, duração das luzes e `iconDuration` para a troca do símbolo.

A luz usa Reanimated no Android/iOS e CSS na web. Anima apenas transformações e opacidade. Os focos ultrapassam a área visível, e um degradê fixo suaviza as quatro extremidades, evitando faixas pretas e cortes retangulares durante o movimento. Reduzir movimento não altera a luz; o loop pausa em segundo plano. Os cards recebem a luz através de uma película translúcida com reflexo suave; não há um filtro de blur por card durante a rolagem.

## Navegação por plataforma

`GlassMaterial.ios.jsx` usa o `GlassView` de `expo-glass-effect` com o material nativo do iOS 26. A ativação depende das duas verificações de disponibilidade da biblioteca: suporte à API e disponibilidade do Liquid Glass no sistema/binário. O material `regular` recebe uma película grafite para impedir que textos e cores do conteúdo interfiram na leitura da navegação. No escuro, a lente selecionada recebe um acabamento prateado, enquanto a barra, a ação de voz e o microfone mantêm a película escura. No claro, barra e ação de voz usam película branca, enquanto lente e microfone permanecem escuros com símbolos brancos. Em versões anteriores, usa `expo-blur` com material correspondente ao tema. Reduzir transparência usa uma superfície opaca.

No Android, `GlassMaterial.jsx` usa `expo-blur` com o conteúdo das telas como um único `BlurTargetView`. O método `dimezisBlurViewSdk31Plus` ativa o desfoque em Android 12+ e oferece acabamento translúcido nas versões anteriores. A luz do topo fica fora dessa captura para que seu movimento não atualize o fundo do dock em repouso. Barra, ação de voz e microfone compartilham o mesmo alvo; a lente mantém película e reflexo sobre a barra, sem uma quarta camada de blur. Bordas suaves, reflexo prateado e uma lente animada reproduzem a direção visual da referência, sem a refração nativa da Apple.

Cada um dos dois focos de luz pode reutilizar uma textura no Android enquanto anima. O cache cobre apenas a decoração estática e é liberado ao pausar o app ou desmontar a decoração; telas, textos, gráficos e listas não são rasterizados. Luz e reflexos são memoizados, e a rolagem só publica um novo alvo de compactação quando ele muda. Cores, percurso e duração da luz continuam os mesmos, assim como os cartões sobrepostos e o material nativo do iOS.

A barra tem quatro abas e um botão circular de voz separado. A lente se move com mola somente quando a aba ativa muda; pressionar a aba ativa altera apenas sua escala. Soltar ou cancelar um toque não devolve a lente à posição anterior, mesmo que o evento chegue depois da troca. Ícones e rótulos têm contraste próprio sobre o vidro, e a área de cada aba ocupa toda a largura disponível. Nas quatro telas principais, a barra compacta ao descer e expande ao subir ou ao tocar na aba ativa compactada. Pequenos movimentos e o bounce não alternam a barra. O espaço reservado no conteúdo permanece fixo durante a animação para evitar saltos na rolagem.

O acabamento da navegação é uma variante própria de `GlassMaterial`, ativada por `navigation`. A película grafite mais densa reduz a interferência de textos e cores do fundo; o contorno, a sombra suave e a lente prateada distinguem a barra dos cards. A aba selecionada usa texto em negrito. `DockShade` aplica um degradê fixo até a cor do fundo do tema atrás de toda a região inferior, com queda até transparente acima dos controles. A camada decorativa não intercepta toques, não recebe blur e fica fora de `BlurTargetView`. Todas as plataformas compartilham os tokens de `dock`, inclusive as superfícies opacas da redução de transparência. O acabamento padrão continua atendendo às setas de voltar. O Liquid Glass nativo permanece ativo quando disponível, e a geometria e as animações da navegação permanecem iguais.

Na web, o material usa `backdrop-filter`. Essa prévia permite conferir layout e interação, mas não reproduz a renderização nativa do iOS.

Na navegação compacta, a lente ocupa os mesmos 54 × 54 px do botão ativo. `GlassBackButton` centraliza a seta em um círculo de 44 px e é o único responsável pelos botões de voltar de páginas e formulários. Ele usa Liquid Glass quando disponível; o fallback conserva película e borda sem amostrar novamente o desfoque do próprio conteúdo rolável.

`ToastContent` é compartilhado pelas versões nativa e web de `Toast`. A notificação fica acima do conteúdo, com superfície opaca e toque para fechar. Sucesso mostra uma confirmação compacta; avisos e erros preservam a explicação. `ToastContext` controla substituição, tempo e fechamento sem depender da tela. A entrada curta desloca a notificação sem alterar sua opacidade; Reduzir movimento mantém a mesma animação de entrada.

## Header transparente

`FloatingAppHeader` conserva a logo e o avatar nas quatro abas principais, acima do conteúdo que rola. O material ocupa toda a largura da tela, sem contorno, raio ou sombra de painel. `HeaderBackdrop` aplica uma película leve, uma camada de desfoque e uma máscara que termina em alpha zero na base. Os valores pertencem a `header` em `src/theme/silver.js`. O conteúdo começa abaixo dessa área; sua reserva fica no próprio scroller, por `useDockPadding`, e desaparece nos detalhes e formulários em que o header está oculto.

No Android, a captura é a mesma do dock, sem incluir o próprio header. A máscara de `@react-native-masked-view/masked-view` é estática e usa renderização por hardware; a intensidade do blur não anima nem recebe atualizações de React a cada frame. iOS usa `expo-blur` para o header, e web usa `backdrop-filter` com máscara CSS. A redução de transparência mantém uma superfície opaca. Logo e avatar ficam montados nas transições; o blur é desmontado quando não está visível. O fundo não intercepta gestos de rolagem.

## Dados e funcionalidades

`SwipeableRow` mantém a ação de exclusão ao lado da borda da linha durante todo o gesto, usando um deslocamento derivado do mesmo valor animado. Ao arrastar de volta para a direita, o vermelho recua junto com o conteúdo e sai pelo recorte do container, sem aparecer atrás do texto translúcido. O botão usa cantos arredondados, respiro e o rótulo “Excluir”. A confirmação, a acessibilidade e o gesto vertical de rolagem mantêm seu comportamento. A correção é compartilhada por categorias, extrato e detalhes de contas/faturas.

`DrawerPanel` aplica a superfície opaca `colors.dialogSurface` aos drawers de perfis, filtros, seletores e pagamento de fatura. A variante `fullScreen`, usada pelo registro por voz, aplica `colors.background`, igualmente opaco. `ConfirmationDialog` usa `dialogSurface` nos popups. Os componentes de cada fluxo continuam responsáveis apenas por dimensões e conteúdo; o acabamento pertence às duas primitivas compartilhadas. A página não aparece através dos painéis. Saída e bloqueio durante envio preservam seus contratos; Reduzir movimento não desativa as transições.

A abertura dos drawers foi corrigida em `DrawerModal` e nos adaptadores de `useDrawerAnimation` e `DrawerPanel`. O deslocamento inicial usa a altura completa da tela até medir o painel, depois a altura medida mais 24 px. No celular, a entrada só começa depois de medição e `onShow`; no navegador, aguarda a pintura da posição inicial. Uma transição de 300 ms com curva de sheet substitui a mola, sem reinício causado pela montagem do modal. A saída mantém 260 ms e a curva `t³`. Reanimated executa a translação nativa na UI; CSS executa a web, sem renders React por frame. A reabertura usa a posição corrente, e conclusão antiga não desmonta um drawer reaberto. `onShow` dos consumidores, fechamento e conteúdo retido são preservados; os tempos de animação independem de Reduzir movimento.

- As chamadas e os contratos da API continuam os mesmos.
- Categorias usa o GET `/api/dashboard?year=…&month=…` existente para gastos e distribuição. A edição e a exclusão confirmada continuam disponíveis apenas para categorias personalizadas.
- Extrato mantém consulta paginada e filtros. Seu resumo corresponde aos lançamentos carregados e filtrados; a interface informa quando há mais páginas.
- Detalhes de contas e faturas continuam preservando sua posição de rolagem e paginação.
- Avatar, perfis salvos, formulários e registro por voz mantêm suas ações.
- Contas mostra apenas contas; Cartões mantém a pilha e apresenta todos os cartões abaixo, com fatura, limite disponível, limite total e uso do limite. Ambos usam o mesmo conjunto já retornado pela API.
- O resumo do cartão selecionado abre seus detalhes pelo UUID, com seta à direita. “Ver fatura” abre a fatura indicada pelo UUID próprio, como na lista comparativa; os alvos de toque são separados.

## Build e verificação

O drawer de voz usa uma malha orgânica prateada, com frente iluminada, fundo discreto e halo suave. No claro, a mesma malha e as ondas são pretas, com microfone escuro e símbolo branco; o fundo recebe a luz preta animada. A geometria é pré-calculada e compartilhada nas plataformas. Android/iOS atualizam dois paths SVG pelo Reanimated na thread de UI; a web atualiza os mesmos paths com requestAnimationFrame, sem renders React por frame. O botão central tem gradiente prateado e anel pulsante: Reanimated nativo e CSS via React Native Web. Não há blur animado nem dependência nativa adicional. Esfera e pulso animam somente durante a escuta real e encerram seus loops ao parar, fechar, desmontar ou entrar em segundo plano. Por pedido do usuário, usam ReduceMotion.Never no ciclo nativo e não consultam a preferência de movimento reduzido na web. A mesma política de movimento vale para todo o app; o feedback de escuta não representa medição de volume.

A interface de voz ocupa a tela inteira, com voltar no topo, regravar à esquerda, microfone no centro e fechar à direita, sem menu de três pontos. A escuta exibe o trecho recente do texto. Parar pelo microfone revela a revisão integral no mesmo cenário: a transcrição sobe enquanto esfera e ondas perdem opacidade e escala. O texto ocupa a área da ilustração, sobre o fundo do tema, sem card, rótulo ou título grande de outra tela. O campo cresce dentro do scroller e os controles ficam na base. O lápis foca a edição; o centro passa a confirmar e analisar. Regravar inverte as transições, substitui a captura e ignora resultados atrasados. O envio continua dependendo da confirmação explícita e mantém o texto quando a API falha.

`VoiceScene` coordena texto e ilustração em um único progresso nativo via `useVoiceReviewProgress`; a web usa transições CSS equivalentes. A altura disponível é medida para adaptar o percurso ao aparelho e ao teclado. `VoiceMicGlyph` faz a troca reversível dos símbolos com rotação, escala e opacidade. Os efeitos não animam altura, blur ou sombras por frame, e preservam o progresso ao serem interrompidos. As transições seguem a política global de animação permanente, inclusive com Reduzir movimento ligado.

`ListeningWave` acrescenta ondas em uma malha discreta abaixo da esfera. Dois paths SVG se deformam em ciclo contínuo com transparência nas extremidades. O cálculo roda na UI nativa; os adaptadores Vite e Expo web atualizam os paths sem renders React por frame. As ondas começam somente após o reconhecimento iniciar a captura e param na preparação, finalização, revisão, erro, fechamento ou segundo plano. O microfone recebe reflexo prateado, halo que respira e dois anéis de luz com fases alternadas. Esses efeitos indicam captura ativa; não medem o volume do áudio. Nenhum blur animado ou pacote novo foi acrescentado.

Em telas abaixo de 700 px de altura, esfera, ondas e espaçamento da transcrição usam uma composição compacta. A área de toque do microfone permanece em 72 px e os controles laterais em 48 px. O conteúdo conserva rolagem para textos longos e fontes maiores; a base permanece fixa.

Foram adicionados `expo-glass-effect` e `expo-blur`. A nova base inclui também Reanimated e Worklets. O acabamento do header acrescenta `@react-native-masked-view/masked-view` (0.3.2), disponível no Expo Go. É necessário gerar APK e IPA novos: OTA não adiciona módulos nativos a um binário antigo. Depois, mudanças apenas em estilos, cores e animações podem ser publicadas por OTA quando o runtime for compatível.

Validação inicial da identidade: 444 testes em 56 suítes. A correção da navegação passou em 39 testes das três suítes de barra, rolagem e navegação principal, além do build web e da exportação dos bundles Android/iOS/web. A inspeção na web cobriu larguras de 320 e 390 px, trocas sucessivas entre abas, compactação e contraste sobre lançamentos coloridos. Os testes incluem disponibilidade/fallback do Liquid Glass, redução de transparência, acessibilidade, toque cancelado, soltura atrasada e movimento reduzido. A exportação de bundles não substitui uma build de release nem a conferência da refração e da fluidez em aparelhos físicos.

Os ajustes de toast, voltar e cartões passaram nos 450 testes em 56 suítes. A inspeção no app web confirmou abertura de detalhes, separação de abas, lista comparativa e lente compacta. A prévia com dados sintéticos confirmou o toast opaco e a mensagem longa de erro em 320 px.

As otimizações de renderização no Android passaram em 459 testes de 59 suítes, lint sem erros (dois avisos anteriores) e exportação Android/iOS/web. Os testes cobrem cache e pausa da luz, movimento reduzido, compartilhamento do desfoque, captura sem luz no Android, compactação e paginação. Não houve aparelho disponível por ADB nesta validação: a redução de quatro para três camadas de blur é verificável no código, mas não representa uma medição de FPS. Compare rolagem, troca de abas e cartões no Android em um APK de release, além do Expo Go.

A suavização das bordas passou em 34 testes de luz e navegação, lint sem erros e exportação Android/iOS/web. A prévia web foi inspecionada durante o movimento e em largura de 320 px. A confirmação visual está em `verification/light-edges/dashboard-top.png`.

O header transparente passou na suíte completa de 466 testes em 60 suítes, lint sem erros (dois avisos anteriores), build web e exportação Android/iOS/web. A auditoria Premium em modo estrito não encontrou violações. A inspeção web cobriu as quatro abas, conteúdo rolando sob o header, acesso aos perfis, abertura e retorno de formulário, pilha de cartões e larguras de 320, 390 e 467 px. O desfoque foi conferido na web; sua composição e fluidez nativas ainda precisam ser verificadas no aparelho. Prévia: `verification/header/header-scrolled.png`.

O reforço de contraste da navegação passou nos 466 testes em 60 suítes, lint sem erros (dois avisos anteriores), build web e exportação Android/iOS/web. A auditoria Premium estrita não encontrou violações. A inspeção web confirmou a leitura sobre lançamentos coloridos, barra expandida e compactada e largura de 320 px. A nova camada não acrescenta desfoque nem animação contínua. O acabamento nativo ainda precisa ser conferido no aparelho. Prévia: `verification/navigation-contrast/after.png`.

As superfícies opacas de drawers e popups passaram nos 466 testes em 60 suítes, lint sem erros (dois avisos anteriores), build web e exportação Android/iOS/web. A auditoria Premium estrita não encontrou violações; o validador oficial do DESIGN.md registrou zero erros e 27 avisos sobre a documentação existente. A inspeção web cobriu o drawer de perfis, filtros com seleção de categorias aberta, confirmação sobre outro drawer, cancelamento, Escape e retorno do foco, incluindo a confirmação em 320 px. As animações mantêm seu comportamento anterior; a renderização nativa ainda precisa ser conferida no aparelho. Prévia: `verification/opaque-overlays/filters.png`.

O retorno da exclusão por arraste foi reproduzido na web antes da correção. A inspeção após o ajuste confirmou que a borda vermelha se mantém ao lado da linha, com zero sobreposição nos pontos medidos durante abertura e retorno. O botão arredondado foi conferido em 467 e 320 px; o alvo de toque permaneceu com 54 px de largura e pelo menos 60 px de altura nesses lançamentos. A suíte completa passou nos 466 testes em 60 suítes, incluindo os 44 testes dos fluxos de categorias, transações e navegação principal. Lint do componente, build web, exportação Android/iOS/web e auditoria Premium estrita passaram. DESIGN.md continuou sem erros no validador oficial. A inspeção do gesto em aparelho físico permanece pendente. Prévia: `verification/swipe-return/after.png`.

A esfera de voz passou nos 472 testes em 62 suítes, lint sem erros (dois avisos anteriores), build web e exportação Android/iOS/web. Os testes cobrem movimento contínuo com ReduceMotion.Never, fim do ciclo sem salto, geometria dentro do quadro, pausa em segundo plano, desmontagem, início/fim da escuta e atualização dos paths tanto no adaptador Vite quanto no SVG do Expo web. A inspeção usou transcrição simulada, sem acesso ao microfone nem requisições à API, em 390 × 844 e 320 × 568 px; confirmou deformação, transcrição legível, parada, revisão e nova gravação. Auditoria Premium estrita: zero violações. DESIGN.md: zero erros e 27 avisos existentes. A fluidez nativa permanece para conferência em aparelho físico. Prévia: `verification/listening-orb/listening.png`.

O registro por voz em tela inteira passou nos 475 testes em 62 suítes, lint sem erros (dois avisos anteriores), build web e exportação Android/iOS/web. Os novos testes cobrem parada pelo microfone, revisão integral, nova gravação sem resultados atrasados e início/fim do pulso com ReduceMotion.Never. A inspeção com transcrição simulada confirmou o microfone visível e pulsante, edição, regravação, fechamento e controles acessíveis em 390 × 844 e 320 × 568 px. Um texto de 1.286 caracteres cresceu no editor e seu fim ficou acessível no scroller, preservando os botões na base. Auditoria Premium estrita: zero violações. DESIGN.md: zero erros, 27 avisos existentes. Safe areas, teclado e fluidez nativa ainda precisam ser conferidos no aparelho. Prévias: `verification/listening-orb/fullscreen-listening.png` e `verification/listening-orb/fullscreen-review.png`.

As ondas e luzes passaram nos 480 testes em 62 suítes, lint sem erros e exportação Android/iOS/web. A inspeção com áudio simulado confirmou as ondas durante a captura, três camadas animadas de luz no microfone e nenhuma delas na revisão. A composição compacta mostrou transcrição e controles sem sobreposição em 320 × 568 px; a composição normal foi conferida em 390 × 844 px. Os testes cobrem deformação, continuidade do ciclo, limites da malha, movimento reduzido, cancelamento em segundo plano e atualização de paths nos adaptadores Vite e Expo web. Não houve medição de FPS nem teste de áudio físico. Prévia: `verification/listening-orb/waves-listening.png`.

A revisão no mesmo cenário passou nos 484 testes em 63 suítes, lint sem erros (dois avisos anteriores), build web e exportação Android/iOS/web. Os testes cobrem ida e volta do progresso, permanência do texto, troca reversível do símbolo, desmontagem e Reduzir movimento, além dos fluxos existentes de confirmação, falha e regravação. A inspeção web confirmou a subida do texto, desaparecimento da ilustração, retorno da captura e ícone final, com transcrição simulada. Um texto de 1.142 caracteres ficou legível até o fim em 320 × 568 px; o campo diminuiu de 1.300 para 66 px ao trocar por texto curto, sem espaço vazio acumulado. A composição normal foi conferida em 390 × 844 px. Áreas seguras, teclado e fluidez precisam ser conferidos em aparelho físico. Prévia: `verification/listening-orb/scene-review.png`.

A abertura dos drawers passou nos 491 testes em 64 suítes, incluindo dez casos nativos/web de entrada, saída, medição, prontidão do modal, reabertura e cancelamento. Lint sem erros (dois avisos anteriores), build web, exportação Android/iOS/web e auditoria Premium estrita passaram; DESIGN.md permaneceu sem erros e com 27 avisos existentes. A prévia de voz com captura simulada confirmou a entrada CSS de 300 ms, a curva de sheet, a posição final em zero e o fechamento, em 390 × 844 e 320 × 568 px. Não houve medição de FPS em aparelho: conferir a fluidez nativa em build de release. Evidência: `verification/listening-orb/drawer-entry-motion.json` e `verification/listening-orb/drawer-entry-open.png`.


Validação de claro/escuro (13/10/2026): 496 testes em 65 suítes, incluindo persistência, falha de gravação, troca sem remontar campos e atualização de materiais nativos, toast e microfone. ESLint sem erros, com dois avisos anteriores. Build Vite e exportações Expo Android/iOS/web concluídas. Auditoria premium estrita sem violações; designmd sem erros (avisos de tokens espelhados e transparência). Prévia com dados simulados: 22 telas nos dois modos, componentes principais em 320 e 390 px, toggle persistido após recarregar, filtros e confirmação opacos, cartões com cores preservadas, escuta/revisão/regravação no claro. A execução e o vidro em aparelhos físicos ainda precisam de conferência no Expo; a exportação não mede FPS.



## Animações revisadas para a política permanente

| Efeito | Responsável compartilhado | Resultado |
| --- | --- | --- |
| Splash, símbolo e wordmark | `AnimatedSplash` | Escala, revelação e saída com tempos completos |
| Navegação entre telas e abas | `AppNavigator`, `ScreenTransition` | Transições mantidas |
| Entrada e saída de drawers | `DrawerModal`, `useDrawerAnimation` | Medição e animações de 300/260 ms mantidas |
| Popups de confirmação | `ConfirmationDialog` | Fade mantido |
| Lente e toque na navegação | `GlassDock` | Molas mantidas, `Never` explícito |
| Compactação e expansão do dock | `DockProvider`, `GlassDock.web` | 260 ms mantidos |
| Luz prateada/preta | `AmbientLight` nativo/web | Loop e percurso mantidos |
| Toasts | `Toast` nativo/web | Entrada de 180 ms mantida |
| Indicadores de seleção | `SegmentedControl` | Mola mantida |
| Pilha de cartões | `HomeCreditCards` | Levantamento, troca de camada e assentamento mantidos |
| Toque em contas | `HomeAccountRow` | Escala de pressão mantida |
| Gráficos e valores do dashboard | `CategoryExpensesChart`, `BalanceEvolutionChart`, `HomeScreen` | Desenho e fades mantidos quando os dados estão visíveis |
| Troca de fatura | `InvoiceTransition` | Transição mantida |
| Malhas de escuta | `ListeningOrb`, `ListeningWave` | Animação durante captura mantida |
| Luzes do microfone | `VoiceMicPulse` | Halo e anéis mantidos |
| Escuta/revisão e troca de símbolo | `VoiceScene`, `VoiceMicGlyph`, `useVoiceReviewProgress` | 280/180 ms mantidos |
| Retorno do arraste de exclusão | `SwipeableRow` | Mola mantida |

As interrupções de desmontagem, reabertura, alteração dos dados, ocultação de valores e fim de captura continuam válidas. A política não mantém loops inúteis quando a tela está fechada ou o app está em segundo plano. A redução de transparência não é uma preferência de movimento e não foi alterada.


Validação da política de movimento permanente (13/10/2026): 499 testes em 66 suítes. Casos novos usam a política real com preferência nativa ligada e consulta web simulada ligada; verificam ausência de leitura/assinatura da preferência, defaults Never, luz ativa e tempos de lente, toast e revisão. ESLint sem erros (dois avisos anteriores), build Vite, exportações Expo Android/iOS/web e auditoria premium estrita passaram. DESIGN.md sem erros. A prévia com dados e áudio simulados manteve os loops da luz em execução, confirmou revisão/regravação e durações CSS de 280 ms com a preferência simulada ligada. A fluidez e o comportamento do sistema em aparelhos físicos não foram medidos.


Falhas na análise por voz são exibidas dentro do drawer, abaixo da transcrição preservada, por `VoiceAnalysisFeedback`. A API entrega code, missingFields e fieldErrors. VOICE_INFORMATION_REQUIRED e VOICE_INPUT_INVALID usam o ícone amarelo e mostram rótulos legíveis com a orientação de cada campo; VOICE_ANALYSIS_UNAVAILABLE, rede e demais falhas técnicas usam ícone vermelho. HTTP 400/422 é apenas o fallback para a API antiga. Título, texto e superfície opaca continuam neutros nos dois temas. Corrigir o texto, regravar, reenviar ou reabrir limpa o aviso anterior. O drawer continua aberto no erro; o controle central permite confirmar novamente ou tentar novamente. Somente o sucesso do registro emite toast. Os campos mostrados são exclusivamente os apontados pela API, sem inferência ou enumeração de dados já preenchidos.
