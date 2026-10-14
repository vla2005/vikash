---
name: Vikash
description: Aplicativo de finanças pessoais com foco em leitura rápida de valores e ações claras.
colors:
  primary: "#242527"
  primaryPressed: "#44464B"
  primarySoft: "#E7E8EB"
  background: "#FAFAFA"
  surface: "rgba(255,255,255,0.82)"
  dialogSurface: "#FFFFFF"
  surfaceMuted: "#ECECEE"
  text: "#111214"
  secondary: "#5D5E64"
  placeholder: "#62646B"
  border: "rgba(17,18,20,0.12)"
  positive: "#08734F"
  positiveSoft: "#DCF6E9"
  negative: "#B42C49"
  negativeSoft: "#FFE9EE"
  warning: "#815321"
  warningSoft: "#FFF0D2"
  info: "#6843B9"
  infoSoft: "#EEE7FF"
  balanceSurface: "rgba(255,255,255,0.82)"
  onBalance: "#111214"
  balanceSecondary: "#5D5E64"
  error: "#A3322C"
  errorSoft: "#F9EDEA"
  onPrimary: "#FFFFFF"
  dangerButton: "#A3322C"
  dangerPressed: "#8A2924"
  onDanger: "#FFFFFF"
  brandPrimary: "#242527"
  brandPressed: "#44464B"
  onBrand: "#FFFFFF"
  logoSurface: "#FFFFFF"
  dark-primary: "#E0E1E3"
  dark-primaryPressed: "#BFC1C5"
  dark-primarySoft: "#292A2C"
  dark-background: "#050505"
  dark-surface: "rgba(23, 23, 24, 0.68)"
  dark-dialogSurface: "#1C1C1F"
  dark-onBalance: "#F4F4F3"
  dark-balanceSecondary: "#B0B0B4"
  dark-surfaceMuted: "#252527"
  dark-text: "#F4F4F3"
  dark-secondary: "#B0B0B4"
  dark-placeholder: "#A1A1A6"
  dark-border: "rgba(255,255,255,0.10)"
  dark-positive: "#79DDB6"
  dark-positiveSoft: "#17372C"
  dark-negative: "#F79B9F"
  dark-negativeSoft: "#3A2427"
  dark-warning: "#FFCE75"
  dark-warningSoft: "#453722"
  dark-info: "#C6A4FF"
  dark-infoSoft: "#392C53"
  dark-balanceSurface: "rgba(23, 23, 24, 0.68)"
  dark-error: "#FFB1A8"
  dark-errorSoft: "#442D32"
  dark-onPrimary: "#151516"
  dark-brandPrimary: "#D8DADC"
  dark-onBrand: "#151516"
typography:
  sans:
    fontFamily: "Vikash Sans, Arial, sans-serif"
  title:
    fontFamily: "Vikash Sans, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-1.1px"
  body:
    fontFamily: "Vikash Sans, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4375
  label:
    fontFamily: "Vikash Sans, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5384615385
rounded:
  field: "14px"
  button: "16px"
  panel: "24px"
  sheet: "30px"
  dialog: "28px"
components:
  button-primary:
    backgroundColor: "{colors.brandPrimary}"
    textColor: "{colors.onBrand}"
    rounded: "{rounded.button}"
    padding: "15px 20px"
  button-primary-dark:
    backgroundColor: "{colors.dark-brandPrimary}"
    textColor: "{colors.dark-onBrand}"
    rounded: "{rounded.button}"
    padding: "15px 20px"
  button-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.button}"
    padding: "15px 20px"
  DeleteActionButton:
    backgroundColor: "{colors.errorSoft}"
    textColor: "{colors.error}"
    rounded: "{rounded.button}"
  DeleteActionButton-dark:
    backgroundColor: "{colors.dark-errorSoft}"
    textColor: "{colors.dark-error}"
    rounded: "{rounded.button}"
  ConfirmationDialog:
    backgroundColor: "{colors.dialogSurface}"
    textColor: "{colors.text}"
    rounded: "{rounded.dialog}"
  ConfirmationDialog-dark:
    backgroundColor: "{colors.dark-dialogSurface}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.dialog}"
  field:
    backgroundColor: "{colors.surfaceMuted}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "15px"
  navigation:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.sheet}"
    padding: "9px 5px"
  filter-chip:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    rounded: "13px"
    padding: "0px 14px"
  credit-card-summary:
    backgroundColor: "{colors.surfaceMuted}"
    textColor: "{colors.text}"
    rounded: "18px"
    padding: "12px"
  appearance-toggle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.field}"
    padding: "18px"
  balance-card:
    backgroundColor: "{colors.balanceSurface}"
    textColor: "{colors.onBalance}"
    rounded: "{rounded.panel}"
    padding: "20px"
  balance-card-dark:
    backgroundColor: "{colors.dark-balanceSurface}"
    textColor: "{colors.dark-onBalance}"
    rounded: "{rounded.panel}"
    padding: "20px"
  financial-metric-income:
    backgroundColor: "{colors.positiveSoft}"
    textColor: "{colors.positive}"
    rounded: "15px"
    padding: "12px"
  financial-metric-expense:
    backgroundColor: "{colors.negativeSoft}"
    textColor: "{colors.negative}"
    rounded: "15px"
    padding: "12px"
  financial-metric-income-dark:
    backgroundColor: "{colors.dark-positiveSoft}"
    textColor: "{colors.dark-positive}"
    rounded: "15px"
    padding: "12px"
  financial-metric-expense-dark:
    backgroundColor: "{colors.dark-negativeSoft}"
    textColor: "{colors.dark-negative}"
    rounded: "15px"
    padding: "12px"
  icon-tile:
    backgroundColor: "{colors.primarySoft}"
    rounded: "12.6px"
    size: "42px"
  category-badge-vivid:
    backgroundColor: "#AC7A08"
    textColor: "#101727"
    rounded: "9.88px"
    size: "38px"
  segmented-selected:
    backgroundColor: "{colors.brandPrimary}"
    textColor: "{colors.onBrand}"
    rounded: "12px"
    height: "36px"
---

## Política global de animação

A política do Vikash mantém todas as animações independentes de Reduzir movimento, por decisão explícita do usuário. `useReducedMotion` é o ponto compartilhado de compatibilidade e retorna sempre `false`, sem ler `AccessibilityInfo` ou `prefers-reduced-motion` e sem assinar mudanças do sistema. `AppMotionPolicy` fixa os defaults nativos do Reanimated com `ReducedMotionConfig / ReduceMotion.Never`; drawer, revisão de voz, toast, lente e compactação também passam `Never` explicitamente. A alternativa web não importa o motor nativo. Isso não modifica configurações do aparelho. Pausas em segundo plano, desmontagem, conteúdo oculto ou fim de captura continuam sendo regras do ciclo de vida, e Reduzir transparência continua independente.

# Design System: Vikash

## Overview

**Creative North Star: "Leitura financeira clara"**

Interface de produto para consultar contas, compras e faturas no celular. A identidade atual combina preto/grafite e luz prateada no escuro, branco/carvão e luz preta no claro, com cards foscos, preservando Plus Jakarta Sans e as cores próprias de categorias e instituições. A linguagem é português brasileiro; valores são formatados em reais.

O app oferece claro e escuro da mesma identidade, aplicados por `ThemeProvider` e `ThemeVariant`. A pilha sobreposta conserva desenho, artwork, cores das instituições e movimento. O modelo de propriedade é runtime canônico (Model B): `src/theme/index.js` fornece a base, `src/theme/silver.js` define a identidade atual e `ThemeVariant` a entrega aos componentes. Este documento espelha os tokens; não gera outro sistema de valores. Categorias usam `src/theme/categoryPalette.js`. `SILVER-DESIGN.md` documenta luz, vidro e navegação por plataforma.

**Key Characteristics:**

- Leitura rápida de valores, com dígitos tabulares quando disponíveis.
- Prateado para identidade e ações sólidas; primário semântico para texto e contornos.
- Verde para entradas e limite disponível nos detalhes; coral para saídas, âmbar para atenção e violeta para apoio.
- Categorias com acentos explícitos por tema, em versões suave e vivid.
- Superfícies arredondadas e hierarquia tonal sobre o fundo de cada tema.
- Uma identidade neutra em dois modos, com luz suave e fundos de vidro fosco.
- Navegação em uma camada própria de grafite, distinta dos cards: película mais densa, contorno e sombra suaves, lente prateada e degradê escuro atrás dos controles. Os tokens são `dock` em `src/theme/silver.js`, usados por `GlassMaterial` e `DockShade`.
- Header fixo e transparente, sem painel retangular; desfoque com queda suave na base preserva a leitura sobre o conteúdo rolável. `FloatingAppHeader` e `HeaderBackdrop` recebem os tokens de `header` em `src/theme/silver.js`.
- Drawers e popups de confirmação usam grafite opaco, para impedir que o conteúdo da página atravesse suas informações. `colors.dialogSurface` pertence ao tema e é aplicado por `DrawerPanel` e `ConfirmationDialog`; os cards conservam sua superfície fosca.

## Colors

A paleta combina ações prateadas com preto e grafite e pares semânticos legíveis sobre a superfície correspondente.

### Primary

- **Azul semântico:** `primary`, `primaryPressed` e `primarySoft` orientam links, contornos, indicadores e seleção suave; seus pares `dark-*` cumprem os mesmos papéis no escuro. `onPrimary` acompanha fundos que usam `primary`.
- **Azul de marca:** `brandPrimary`, `brandPressed` e `onBrand` permanecem fixos. `PrimaryButton` sólido e o indicador selecionado de `SegmentedControl` usam `brandPrimary` com `onBrand` nos dois temas. Texto e contorno da variante outlined usam `primary` do tema.
- **Azul de saldo:** `balanceSurface` e `dark-balanceSurface` criam o painel saturado de saldo e os avatares de perfil. `onBalance` e `balanceSecondary` permanecem fixos para valor, rótulo e apoio nesse fundo.

### Secondary

- **Verde financeiro:** `positive` e `positiveSoft` indicam entradas, estados positivos e limite disponível em `CreditCardDetailsScreen` quando não negativo. `CreditCardSummary` preserva o indicador disponível em primário semântico.
- **Coral financeiro:** `negative` e `negativeSoft` indicam saídas e limite disponível negativo.
- **Âmbar de aviso:** `warning` e `warningSoft` identificam avisos e estados de fatura.
- **Vermelho destrutivo:** `error` e `errorSoft` apresentam erros e a ação de excluir. A confirmação usa `dangerButton` com `onDanger`; esse par sólido permanece igual nos dois temas.
- **Violeta de apoio:** `info` e `infoSoft` identificam ajuda e suporte no perfil.
- Os pares `dark-*` preservam os significados. As 30 chaves de categoria salvas na API continuam iguais; `categoryPalettes` usa um par de acentos explícitos por chave. `foreground` é o próprio `accent`; o fundo suave mistura a superfície do tema com 12% do acento no claro e 18% no escuro. `onAccent` escolhe branco ou o neutro escuro pelo maior contraste calculado. Exemplos de acento claro/escuro: ochre (#AC7A08 / #F6C348), blue (#326AD7 / #649CFF) e cyan (#137F9A / #43CCE8). A helper legada `readableAccent` não define essa paleta.

### Neutral

- **Canvas, painel e campo:** `background`, `surface` e `surfaceMuted`, com os respectivos pares escuros, separam o fundo da tela, cartões e campos.
- **Texto e apoio:** `text` e `secondary` distinguem informação principal e contextual. `placeholder` acompanha o apoio claro; `dark-placeholder` é específico para campos escuros.
- **Contorno:** `border` separa grupos, chips e indicadores, seguindo o tema.
- **Base de logo:** `logoSurface` permanece branca para preservar logos; os desenhos e cores dos cartões não são recoloridos pela aparência.

**The Semantic Pair Rule.** Usar fundo e texto do mesmo par semântico e tema. Ações sólidas usam marca/onBrand; saldo usa balanceSurface/onBalance; categoria vivid usa accent/onAccent. Neutros sustentam a leitura, e cor repete rótulos, ícones ou sinais.

## Typography

**Display Font:** Plus Jakarta Sans, já instalada; nenhuma nova família de display.
**Body Font:** Plus Jakarta Sans, pelo alias web `Vikash Sans, Arial, sans-serif` e pelos aliases nativos `VikashSans`, `VikashSansMedium` e `VikashSansBold`.

As definições web estão em `src/web/fonts.css`; o app nativo usa `useAppFonts`. A família e os pesos não mudam com a aparência. O tema compartilhado define título, corpo e rótulo; componentes especializados preservam suas variações existentes.

- **Title:** título principal do tema, em negrito e com espaçamento entre letras mais fechado.
- **Body:** leitura de apoio com entrelinha confortável e cor secundária.
- **Label:** rótulos de formulário, em peso médio.
- **Valores:** dígitos tabulares nos campos monetários e métricas que já os utilizam.
- **Saldo:** `BalanceCard` usa 36 px, entrelinha de 47 px e tracking de -1 px; valor com mais de 16 caracteres usa 27 px. Mantém uma linha, ajuste automático e escala mínima de 0,55.
- **Fluxo mensal:** `FinancialMetric` usa 21 px e entrelinha de 29 px; a versão compacta usa 16 px. Tamanhos locais existentes de detalhes permanecem.

**The Stable Hierarchy Rule.** Trocar o tema altera as cores, preservando família, tamanho, peso e hierarquia das telas existentes.

## Layout

A interface mantém composição de celular com rolagem vertical e área segura. `Screen` centraliza um canvas de largura máxima de 460 px, com margem interna lateral de 24 px. Detalhes do cartão usam 22 px; detalhes de lançamento, Início e Meu perfil usam 20 px. Não há escala global de espaçamento: manter a geometria do componente reutilizado.

O navegador inferior se adapta abaixo de 350 px, reduzindo margens, rótulos e espaço central do microfone. No web largo, o canvas continua centralizado. Drawers preservam largura máxima de 460 px, exceto o registro por voz, que ocupa a tela inteira com fundo opaco e conteúdo central de até 520 px. A confirmação usa no máximo 360 px e 90% da altura disponível. Rótulos de exclusão permanecem visíveis em telas estreitas, com texto e ícone no mesmo alvo de toque.

O Início ordena saldo, período e resumo mensal, com intervalos de 16 px entre os blocos principais. Início e Extrato usam uma linha de métricas com wrap: abaixo de 360 px cada `FinancialMetric` ocupa a largura inteira; de 360 a 389 px, ou com valor de mais de 14 caracteres, o número usa 16 px. Limites em `CreditCardDetailsScreen` empilham abaixo de 390 px ou quando `fontScale > 1.15`.

A evidência visual desta extensão é React Native Web com API sintética: 23 telas nos dois temas e estados/drawers em 390 × 844; seis telas amostradas em 320 e 768 px. O reviewer leu as folhas de contato e referências individuais do Início, sem inspeção completa dos PNGs de tablet. Não houve captura física, Simulator ou emulador. Bundles compilados não aprovam safe areas, gestos, escala de fonte ou animações em hardware nativo.

## Elevation & Depth

O sistema combina camadas tonais com sombras suaves nos cartões de marca e na navegação inferior. As sombras seguem a paleta e não mudam a geometria. A confirmação reutiliza `ConfirmationDialog`, com fundo escurecido independente do conteúdo; drawers usam o backdrop semântico do tema. Valores de sombra e backdrop ficam no sidecar.

`DrawerPanel` usa a transição compartilhada de sheet e `SegmentedControl` desloca seu indicador com mola. A política global mantém ambos animados, independentemente de Reduzir movimento. Não adicionar uma sombra ou animação diferente para uma única exclusão.

## Shapes

Campos e botões usam curvas suaves da família existente; painéis, folhas e confirmação ampliam essa mesma linguagem. Os raios normativos estão no frontmatter. Componentes existentes mantêm variações locais, como o grupo de perfil e aparência (22 px), o resumo de cartão (18 px) e o chip de filtro (13 px). Uma mudança de tema não cria uma nova família de bordas.

## Components

### Buttons

`PrimaryButton` combina ação e rótulo claros, com altura mínima de 54 px, espaçamento interno horizontal de 20 px e vertical de 15 px. A versão sólida usa prateado e texto grafite. A variante outlined mantém fundo transparente, texto e contorno primários do tema. Pressionar reduz opacidade a 0,88 e escala a 0,985; indisponível usa opacidade 0,55. Carregamento mostra “Aguarde...” e bloqueia a ação.

`DeleteActionButton` é compartilhado por transações e faturas, com fundo suave de erro, ícone e rótulo no mesmo alvo de pelo menos 52 px. O vermelho sólido fica na confirmação; não usar vermelho para ações seguras.

`SwipeableRow` apresenta a ação de exclusão revelada pelo gesto em um botão vermelho arredondado, com ícone e rótulo “Excluir”, raio de 14 px e respiro de 6 px. A ação usa `dangerButton`, `dangerPressed` e `onDanger` do tema. Sua posição deriva do mesmo deslocamento da linha, mantendo o vermelho fora do conteúdo durante abertura, retorno parcial e fechamento. O toque abre a confirmação existente; não exclui imediatamente. O componente atende categorias, extrato e listas de detalhes.

### Chips

Filtros de extrato usam contorno e texto de apoio, altura mínima de 40 px e espaçamento horizontal de 14 px. A seleção combina fundo primário suave e contorno primário; a semântica acessível acompanha o estado.

`SegmentedControl` usa trilho neutro atenuado de 44 px, padding de 4 px e raio de 16 px; o indicador tem raio de 12 px, prateado e rótulo grafite. A mola existente permanece; pressionar a opção reduz opacidade a 0,65.

### Cards / Containers

`CreditCardSummary` usa superfície atenuada, raio local e padding de 12 px. Métricas, limite utilizado e divisórias seguem tokens semânticos. Cartões visuais das instituições preservam seus fundos de marca e artwork. `InstitutionLogo` mantém a base branca quando há imagem; falhas usam o ícone de banco.

`BalanceCard` destaca o saldo sobre o vidro escuro, raio de 24 px, padding de 20 px e gap de 8 px. Rótulo, valor e caption usam os pares de saldo; loading mantém skeleton. `FinancialMetric` repete verde/verde suave para entradas e coral/coral suave para saídas no Início e Extrato, com raio de 15 px, padding de 12 px, gap de 10 px e ícone direcional. Não deduzir novos dados ou estados da cor.

`HomeCreditCards` é uma restrição fixa: preservar a pilha sobreposta, sua geometria, desenho e todas as animações. Não recolorir artwork nem alterar algoritmos ou constantes das instituições.

### Category and icon identity

`CategoryBadge` suave usa background/foreground da categoria em listas densas; `vivid` usa accent/onAccent nas grades. O tamanho padrão é 38 px e o raio é 26% do tamanho. `CategoryFormScreen` repete o par sólido na prévia circular de 84 px. `TransactionDetailsLayout` usa categoria sólida na identidade e par suave na linha de categoria; o valor usa o par semântico da direção do dinheiro.

`IconTile` agrupa ícones em superfície suave por `tone`, com tamanho padrão de 42 px e raio de 30% do tamanho; o componente filho fornece a cor do ícone. Perfil usa primário para identidade, âmbar para senha e violeta para suporte. Perfil e edição usam avatar grafite; alteração de senha repete âmbar.

### Inputs / Fields

`FormField` usa superfície atenuada e altura mínima de 54 px. O foco aplica superfície principal e contorno primário; erro aplica contorno e mensagem de erro. `useInputTheme` fornece placeholder, seleção, cursor e aparência do teclado. A web destaca controles com foco visível; o input cujo contêiner já destaca o foco não duplica o outline.

### Navigation

O navegador inferior agrupa Início, Extrato, Contas e Categorias, com botão de microfone circular separado. A lente prateada acompanha apenas a aba confirmada e cobre toda a área circular na versão compacta. Ícones e rótulos mantêm contraste próprio. `GlassBackButton` é o responsável canônico por todas as setas de voltar das páginas, em um círculo de 44 px.

“Pergunte ao ViKash” usa o símbolo de estrela de IA e, ao tocar, mostra o toast informativo “Essa função estará disponível em breve.”, sem abrir tela, iniciar captura ou enviar requisições. O microfone circular separado continua abrindo o registro por voz. `MainTabs` controla os callbacks distintos, `DockLayout` os apresenta nas versões nativa e web e `ToastContext` é o responsável pelo aviso.

### Appearance

A identidade prateada oferece modos claro e escuro em todas as telas, escolhidos por um único toggle “Tema escuro” no perfil. Não há opção Sistema. O padrão é escuro; a escolha clara/escura fica salva no aparelho, é restaurada antes de montar o conteúdo e continua a mesma ao trocar perfis. Valores antigos “system” ou inválidos usam o padrão escuro. Falha ao salvar mantém o tema atual e informa o erro. A troca não remonta telas nem descarta campos ou sessões. “Ajuda e suporte” foi removido do perfil. `AppearanceSettings` é o único controle da preferência. Paletas e efeitos pertencem a `silverThemes` em `src/theme/silver.js`; todos os adaptadores usam os mesmos tokens. A luz parte do topo e se estende suavemente até perto da metade da tela, com intensidade 0,40 e bordas suaves nos dois modos. No claro, malha e ondas são pretas; a navegação branca tem lente e microfone escuros com símbolos brancos. Logo, header, toasts, drawers, popups e teclado acompanham a preferência.

### Confirmation and feedback

`DrawerModal` e `useDrawerAnimation` controlam a entrada e a saída compartilhadas, e `DrawerPanel` aplica o movimento ao painel. A abertura espera medição e disponibilidade do modal, parte de fora da tela e sobe em 300 ms com a curva `(0.32, 0.72, 0, 1)`, sem oscilação. Nativo usa Reanimated; web usa CSS com um quadro inicial fora da tela. O fechamento conserva 260 ms e a curva cúbica anterior. Conteúdo permanece montado até sair, atualizações não reiniciam a entrada e reabrir inverte a animação atual. Reduzir movimento não elimina nem encurta a translação animada. Backdrop e acabamento continuam pertencendo às primitivas e fluxos existentes.

`VoiceDrawer` ocupa a tela inteira com a variante `fullScreen` de `DrawerPanel`, respeitando áreas seguras e teclado. O topo usa `GlassBackButton`, símbolo de voz e o título estável “Registro por voz”, sem menu de três pontos. A base mantém regravar e fechar em alvos de 48 px e o controle central prateado de 72 px. `VoiceMicButton`, `VoiceMicPulse` e `VoiceMicGlow` indicam escuta ativa com reflexo, halo pulsante e dois anéis de luz. Parar a captura faz a transcrição subir e ocupar a área da ilustração. `VoiceScene` coordena desaparecimento da malha e movimento do texto em 280 ms; `VoiceMicGlyph` troca microfone por confirmação em 180 ms. Regravar inverte as duas transições. O texto da revisão fica centralizado sobre o fundo do tema, sem card ou título grande adicional; o lápis foca a edição. O campo cresce com o texto dentro do scroller; os controles permanecem fora dele. As transições usam transform e opacidade, rodam na UI nativa ou em CSS na web e mantêm a animação com Reduzir movimento ligado.

`ListeningOrbSurface` concentra o desenho da esfera de voz. `ListeningWaveSurface` desenha a malha sonora de bordas suaves abaixo dela. `ListeningOrb` e `ListeningWave` controlam suas geometrias na thread de UI nativa; os adaptadores web usam os mesmos cálculos. Os tokens da esfera, das ondas e do microfone pertencem a `voiceOrb` em `src/theme/silver.js`. Os efeitos animam durante a captura ativa, inclusive com Reduzir movimento ativado por solicitação explícita do usuário. Preparação, finalização e erro não simulam escuta. O título e a transcrição preservam a informação acessível. A escuta mostra o trecho recente; a revisão preserva todo o texto e só o envia após confirmação.

`ConfirmationDialog` controla confirmação, carregamento e erro, mantendo foco, Escape e animação do componente canônico. Enquanto a requisição está pendente, os controles ficam desabilitados. `ToastContext` controla as notificações compartilhadas por `ToastContent` e pelos adaptadores nativo/web de `Toast`. O toast é uma cápsula opaca, pequena e centralizada no topo; toque fecha. Sucesso usa uma linha de confirmação. Erros e avisos preservam a explicação e o anúncio acessível. Cores vêm de `toast` em `src/theme/silver.js`. O indicador de tipo usa verde em success, azul em info, amarelo em warn e vermelho em error, com acentos próprios para contraste em claro/escuro. Texto, superfície e contorno da cápsula permanecem neutros. Manter a consequência da exclusão explícita e o erro dentro da confirmação; preservar a lista quando o servidor recusa a operação.

## Do's and Don'ts

### Do:

- Do reutilizar componentes, ícones e tokens semânticos da identidade prateada.
- Do preservar a geometria e a hierarquia tipográfica ao trocar a aparência.
- Do manter seleção nomeada e marca visível, além da cor.
- Do preservar logos, cores de instituições, artwork e todo o desenho e movimento da pilha sobreposta de cartões.
- Do usar accent/onAccent explícitos por tema em categorias vivid e os pares suaves em listas.
- Do manter as quebras responsivas de métricas e o ajuste de números longos.
- Do manter a consequência da exclusão explícita e o erro dentro da confirmação.
- Do preservar a lista se o servidor recusar a operação.

### Don't:

- Don't usar vermelho para ações seguras ou substituir texto/contorno semântico por uma cor fixa sem relação com a identidade atual.
- Don't diluir acentos de categoria escuros com branco ou alterar sua chave salva na API.
- Don't criar outra família de bordas, sombras ou animações para uma exclusão isolada.
- Don't usar diálogo nativo do navegador ou decoração extra nas ações financeiras.
- Don't remontar formulários ou associar a preferência de aparência à sessão de um perfil.


Validação de claro/escuro (13/10/2026): 496 testes em 65 suítes, incluindo persistência, falha de gravação, troca sem remontar campos e atualização de materiais nativos, toast e microfone. ESLint sem erros, com dois avisos anteriores. Build Vite e exportações Expo Android/iOS/web concluídas. Auditoria premium estrita sem violações; designmd sem erros (avisos de tokens espelhados e transparência). Prévia com dados simulados: 22 telas nos dois modos, componentes principais em 320 e 390 px, toggle persistido após recarregar, filtros e confirmação opacos, cartões com cores preservadas, escuta/revisão/regravação no claro. A execução e o vidro em aparelhos físicos ainda precisam de conferência no Expo; a exportação não mede FPS.


Validação da política de movimento permanente (13/10/2026): 499 testes em 66 suítes. Casos novos usam a política real com preferência nativa ligada e consulta web simulada ligada; verificam ausência de leitura/assinatura da preferência, defaults Never, luz ativa e tempos de lente, toast e revisão. ESLint sem erros (dois avisos anteriores), build Vite, exportações Expo Android/iOS/web e auditoria premium estrita passaram. DESIGN.md sem erros. A prévia com dados e áudio simulados manteve os loops da luz em execução, confirmou revisão/regravação e durações CSS de 280 ms com a preferência simulada ligada. A fluidez e o comportamento do sistema em aparelhos físicos não foram medidos.


Falhas na análise por voz são exibidas dentro do drawer, abaixo da transcrição preservada, por `VoiceAnalysisFeedback`. A API entrega code, missingFields e fieldErrors. VOICE_INFORMATION_REQUIRED e VOICE_INPUT_INVALID usam o ícone amarelo e mostram rótulos legíveis com a orientação de cada campo; VOICE_ANALYSIS_UNAVAILABLE, rede e demais falhas técnicas usam ícone vermelho. HTTP 400/422 é apenas o fallback para a API antiga. Título, texto e superfície opaca continuam neutros nos dois temas. Corrigir o texto, regravar, reenviar ou reabrir limpa o aviso anterior. O drawer continua aberto no erro; o controle central permite confirmar novamente ou tentar novamente. Somente o sucesso do registro emite toast. Os campos mostrados são exclusivamente os apontados pela API, sem inferência ou enumeração de dados já preenchidos.

O ícone de instalação e a abertura usam fundo preto (#000000) e símbolo/nome brancos (#FFFFFF), inclusive quando o tema salvo é claro. app.json configura a splash nativa; AnimatedSplash e a barra de status mantêm as mesmas cores durante a abertura. O PNG 1024 px serve ao Expo/prebuild e o WebP 540 px comprimido sem perdas serve à animação de 180 pontos. O desenho e as animações existentes são preservados.

A esfera de escuta nativa mantém a malha monocromática deformável, agora desenhada por shader Skia em um canvas restrito ao tamanho do componente. ListeningOrb controla o ciclo de vida; orbShader define a superfície analítica e seu antialias; as cores continuam em voiceOrb. Sem render React ou criação de paths por quadro. A versão web conserva SVG. Captura, revisão e transições continuam sob os mesmos componentes canônicos.

No Android, AmbientLight reutiliza assets/effects/ambient-light.png (128 × 128, 4.915 bytes, 64 KiB RGBA) nos dois focos, com tintColor dos tokens, transforms e opacity. Não reserva um cache de hardware do tamanho de cada campo. O gradiente neutro pode ser regenerado com node scripts/generate-light-texture.cjs ao alterar fadeStart; cores e intensidade continuam dinâmicas no tema. As máscaras fixas preservam as bordas suaves. A comparação raster local nos dois temas teve diferença máxima de 2/255 por canal em relação ao SVG. iOS conserva SVG e a web pausa os loops quando enabled=false.

As ondas nativas agora interpolam poses Skia pré-calculadas; mantêm a densidade, gradiente, dimensões e estados anteriores. Blur do header/dock permanece no alvo compartilhado e com intensidade fixa. Não foram ativadas flags globais de atualização síncrona de transforms, pois a validação dos hitboxes exige aparelho. Medir a fluidez em build release no Android físico: repetir o mesmo percurso de rolagem, troca de aba e gravação; comparar tempo de frame e travamentos, além da memória.

Após comparação no Expo Go, `src/config/renderingEffects.js` habilita `backgroundBlur` somente no iOS: o iPhone usa BlurView e Liquid Glass quando suportado. Android mantém header e navegação sem desfoque, e o alvo nativo de captura é substituído por View. A web continua sem backdrop-filter durante a comparação. Preenchimentos translúcidos, luzes, sombras e animações continuam iguais.

No Android, a separação do header usa um gradiente fixo na cor do fundo, com 28 pontos de queda além do cabeçalho e alpha zero no final, sem BlurView ou MaskedView. A navegação usa o mesmo sombreado inferior existente com queda mais longa e uma sombra curta nos controles (tokens androidShade/androidShadow em silver.js). Claro e escuro têm cores/intensidades próprias. iOS mantém desfoque/Liquid Glass e sombras anteriores; esfera, luzes, transparência e movimentos não mudam. Conferir aparência e fluidez no Expo Go Android antes de estender ao iPhone.

Otimização de interação: as quatro telas principais usam memoização com callbacks de navegação estáveis, evitando recalcular gráficos/listas ao abrir os drawers de perfis ou voz sem alteração nos dados. Estado local, tema, sessão e revisões da API continuam atualizando as telas. Os modais de drawer, confirmação e período ativam hardwareAccelerated somente no Android. Durações, curvas, transições, sombras e luzes aprovadas são preservadas. Um teste reproduziu o recálculo do dashboard ao abrir perfis antes da mudança e passou depois para abertura/fechamento dos dois drawers. Suíte completa: 549 testes em 72 suítes; desempenho físico ainda depende do teste no Expo Go/release Android.

Animações dos gráficos nativos de categorias e saldo agora usam Reanimated/useAnimatedProps na UI thread, sem Animated.timing(useNativeDriver:false) por frame. ChartMotion mantém 900 ms, curvas anteriores, reveal por strokeDashoffset e fade tardio do tooltip; a web mantém o renderer anterior em ChartMotion.web.jsx. Drawers comuns Android usam renderToHardwareTextureAndroid apenas enquanto o painel está deslocado, liberando ao chegar a zero e desmontando após a saída. Painéis de tela inteira (incluindo voz/Skia) e iOS não usam esse cache. Os caminhos, cores, sombras e dimensões permanecem iguais. Testes validam desenho, valores ocultos, troca de dados, cancelamento e liberação do cache; medição de FPS e memória ainda depende do Android físico.

A seleção Contas/Crédito do dashboard foi isolada em DashboardExpensesChart: alternar o escopo não renderiza novamente HomeScreen nem seus outros blocos. O estado da seleção é preservado durante recarga/mudança do mês, mantendo o gráfico oculto enquanto carrega como antes. DrawerModal conserva um host leve até a primeira abertura, sem inicializar useSharedValue/worklets para seletores fechados dos formulários; a apresentação é preservada depois para reabertura e saída. No Android, runSceneUpdate usa React.startTransition para agrupar montagem de abas, detalhes e formulários em prioridade menor que o feedback do toque; iOS/web mantêm o agendamento anterior. Não há timer, mudança de duração/curva ou novo indicador visual. Os dois trabalhos extras foram reproduzidos em testes antes da mudança; 555 testes passam depois, incluindo seleção durante troca de mês e fechamento/reabertura. Sem Android USB disponível, FPS e latência física ainda não foram medidos.

O cache do DrawerPanel usa um booleano derivado do deslocamento: useAnimatedProps recebe notificações somente quando o estado do cache muda, em vez de reenviar renderToHardwareTextureAndroid a cada frame. A transformação continua atualizando na UI thread. Liberação ao chegar a zero, exclusão dos painéis de tela inteira e iOS permanecem cobertas por testes. Após a alteração: 555 testes em 72 suítes, lint e exportações locais Android/iOS passaram. O Expo lista os aparelhos conectados, mas a tentativa de profiling recebeu HTTP 401; nenhum perfil ou medição de FPS foi obtido.

No Android, as duas máscaras fixas de borda de AmbientLight e os sombreados de HeaderBackdrop/DockShade usam faixas PNG neutras de 2048 × 1 ou 1 × 2048, em vez de SVGs com bitmaps do tamanho das superfícies. As quatro faixas somam 3.198 bytes nos arquivos e 32 KiB RGBA de pixels de origem; isso não é uma medição da memória total do processo/GPU. resizeMethod=none evita redimensionar a decodificação; tintColor acompanha o tema, e a intensidade do header continua aplicada em runtime. Luzes, curvas, opacidades, sombras, posição, recortes e movimentos permanecem; iOS/web conservam os caminhos anteriores. scripts/generate-light-texture.cjs regenera as faixas e a textura da luz após mudanças em fadeStart/edgeFade ou dock.androidShade.

Verificação desta rodada: 563 testes em 74 suítes, incluindo checagem dos PNGs reais contra os stops, ausência de SVG nessas superfícies Android, claro/escuro, pausa/retomada da luz e preservação de iOS. Comparação matemática com amostragem bilinear a 660/1080/1980 pixels teve erro máximo de alpha de 1,139/255, com extremos opacos nas máscaras e transparentes nos sombreados. É uma comparação da curva, não uma captura do aparelho. Lint e builds locais web/Android/iOS passaram; ganho real de FPS ainda requer comparação no Android físico.

Integração Reacticx: FadeComponent e PieChart mantidos. NumberFlow removido por atraso perceptível ao alternar a privacidade no Android; o saldo usa Text estático com a fonte, cores, formatação BRL e ajuste de tamanho existentes.

FadeComponent faz o crossfade de 180 ms entre skeleton e saldo, preservando a instância durante carregamento. Movimentos nativos ignoram redução de movimento conforme política aprovada; callbacks para JS só são agendados quando há consumidor. PieChart usa a geometria/morph do Reacticx em Canvas Skia nativo, com proporção de rosca 65/87, raio externo 87% da metade da caixa e cores reais das categorias. A API local foi reduzida a Root/Slices e o arraste não usado foi removido: não adiciona Gesture Handler nem disputa gestos com a rolagem. As fatias são limitadas ao agrupamento original e animam na UI thread; ocultar elimina os dados e cancela o movimento, inclusive quando interrompe a entrada. Centro, legenda, abas e agrupamento Outros continuam canônicos em CategoryExpensesChart. A web conserva SVG no donut e usa variantes Animated nos dois componentes de valores, sem adicionar runtime Skia/Worklets ao Vite. Nenhuma dependência nativa foi adicionada.

Validação Reacticx: 576 testes em 75 suítes, incluindo ocultação, arredondamento, negativos, fonte ampliada, largura estreita, cancelamento e rosca de categoria única. Lint sem avisos nos arquivos da integração; build web e exportações locais Android/iOS confirmados. Fluidez e aparência nativas ainda precisam de conferência no aparelho; não foi medido FPS.

