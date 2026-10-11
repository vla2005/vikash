---
name: Vikash
description: Aplicativo de finanças pessoais com foco em leitura rápida de valores e ações claras.
colors:
  primary: "#2348EF"
  primaryPressed: "#1838CB"
  primarySoft: "#E8EDFF"
  background: "#F3F5F9"
  surface: "#FFFFFF"
  surfaceMuted: "#EDF1F7"
  text: "#15244A"
  secondary: "#606D83"
  placeholder: "#606D83"
  border: "#DAE1ED"
  positive: "#08734F"
  positiveSoft: "#DCF6E9"
  negative: "#B42C49"
  negativeSoft: "#FFE9EE"
  warning: "#815321"
  warningSoft: "#FFF0D2"
  info: "#6843B9"
  infoSoft: "#EEE7FF"
  balanceSurface: "#2348D9"
  onBalance: "#FFFFFF"
  balanceSecondary: "#DBE4FF"
  error: "#A3322C"
  errorSoft: "#F9EDEA"
  onPrimary: "#FFFFFF"
  dangerButton: "#A3322C"
  dangerPressed: "#8A2924"
  onDanger: "#FFFFFF"
  brandPrimary: "#2348EF"
  brandPressed: "#1838CB"
  onBrand: "#FFFFFF"
  logoSurface: "#FFFFFF"
  dark-primary: "#96AEFF"
  dark-primaryPressed: "#829BEF"
  dark-primarySoft: "#273A66"
  dark-background: "#101727"
  dark-surface: "#1C2636"
  dark-surfaceMuted: "#263244"
  dark-text: "#F0F4FF"
  dark-secondary: "#B1BED4"
  dark-placeholder: "#A1AFC8"
  dark-border: "#3B4A60"
  dark-positive: "#5DE3AB"
  dark-positiveSoft: "#163E32"
  dark-negative: "#FF91A6"
  dark-negativeSoft: "#472936"
  dark-warning: "#FFCE75"
  dark-warningSoft: "#453722"
  dark-info: "#C6A4FF"
  dark-infoSoft: "#392C53"
  dark-balanceSurface: "#3048D5"
  dark-error: "#FFB1A8"
  dark-errorSoft: "#442D32"
  dark-onPrimary: "#101727"
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
    backgroundColor: "{colors.brandPrimary}"
    textColor: "{colors.onBrand}"
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
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.dialog}"
  ConfirmationDialog-dark:
    backgroundColor: "{colors.dark-surface}"
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
  appearance-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.field}"
    padding: "12px 4px"
  balance-card:
    backgroundColor: "{colors.balanceSurface}"
    textColor: "{colors.onBalance}"
    rounded: "{rounded.panel}"
    padding: "20px"
  balance-card-dark:
    backgroundColor: "{colors.dark-balanceSurface}"
    textColor: "{colors.onBalance}"
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

# Design System: Vikash

## Overview

**Creative North Star: "Leitura financeira clara"**

Interface de produto para consultar contas, compras e faturas no celular. A extensão cromática aprovada em `.impeccable/surfaces/color-life.md` mantém a marca Vikash, Plus Jakarta Sans e os cartões arredondados, com saldo azul saturado, entradas verdes, saídas coral e categorias vívidas. Neutros frios no claro e azul-marinho no escuro dão contraste aos valores e às ações. A linguagem é português brasileiro; valores são formatados em reais.

A aparência acompanha o sistema por padrão e oferece escolhas explícitas em Meu perfil. A troca entre essas preferências conserva a geometria da composição atual, os campos e a navegação; a extensão autorizada já introduziu novos agrupamentos de saldo e métricas. A pilha sobreposta de cartões conserva integralmente desenho, artwork, cores das instituições e movimento. O código canônico dos tokens é `src/theme/index.js`; categorias usam `src/theme/categoryPalette.js`.

**Key Characteristics:**

- Leitura rápida de valores, com dígitos tabulares quando disponíveis.
- Azul saturado para saldo, identidade e ações sólidas; primário semântico para texto e contornos.
- Verde para entradas e limite disponível nos detalhes; coral para saídas, âmbar para atenção e violeta para apoio.
- Categorias com acentos explícitos por tema, em versões suave e vivid.
- Superfícies arredondadas e hierarquia tonal consistente nos dois temas.
- Sistema, Claro e Escuro com seleção nomeada e marca visível.

## Colors

A paleta combina um azul de ação com neutros frios e pares semânticos legíveis sobre a superfície correspondente.

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

O navegador inferior se adapta abaixo de 350 px, reduzindo margens, rótulos e espaço central do microfone. No web largo, o canvas continua centralizado. Drawers preservam largura máxima de 460 px; a confirmação usa no máximo 360 px e 90% da altura disponível. Rótulos de exclusão permanecem visíveis em telas estreitas, com texto e ícone no mesmo alvo de toque.

O Início ordena saldo, período e resumo mensal, com intervalos de 16 px entre os blocos principais. Início e Extrato usam uma linha de métricas com wrap: abaixo de 360 px cada `FinancialMetric` ocupa a largura inteira; de 360 a 389 px, ou com valor de mais de 14 caracteres, o número usa 16 px. Limites em `CreditCardDetailsScreen` empilham abaixo de 390 px ou quando `fontScale > 1.15`.

A evidência visual desta extensão é React Native Web com API sintética: 23 telas nos dois temas e estados/drawers em 390 × 844; seis telas amostradas em 320 e 768 px. O reviewer leu as folhas de contato e referências individuais do Início, sem inspeção completa dos PNGs de tablet. Não houve captura física, Simulator ou emulador. Bundles compilados não aprovam safe areas, gestos, escala de fonte ou animações em hardware nativo.

## Elevation & Depth

O sistema combina camadas tonais com sombras suaves nos cartões de marca e na navegação inferior. As sombras seguem a paleta e não mudam a geometria. A confirmação reutiliza `ConfirmationDialog`, com fundo escurecido independente do conteúdo; drawers usam o backdrop semântico do tema. Valores de sombra e backdrop ficam no sidecar.

`DrawerPanel` usa entrada por mola e `SegmentedControl` desloca seu indicador com mola. `useReducedMotion` aplica o estado final diretamente nesses movimentos. Não adicionar uma sombra ou animação diferente para uma única exclusão.

## Shapes

Campos e botões usam curvas suaves da família existente; painéis, folhas e confirmação ampliam essa mesma linguagem. Os raios normativos estão no frontmatter. Componentes existentes mantêm variações locais, como o grupo de perfil e aparência (22 px), o resumo de cartão (18 px) e o chip de filtro (13 px). Uma mudança de tema não cria uma nova família de bordas.

## Components

### Buttons

`PrimaryButton` combina ação e rótulo claros, com altura mínima de 54 px, espaçamento interno horizontal de 20 px e vertical de 15 px. A versão sólida conserva azul de marca e texto branco nos dois temas. A variante outlined mantém fundo transparente, texto e contorno primários do tema. Pressionar reduz opacidade a 0,88 e escala a 0,985; indisponível usa opacidade 0,55. Carregamento mostra “Aguarde...” e bloqueia a ação.

`DeleteActionButton` é compartilhado por transações e faturas, com fundo suave de erro, ícone e rótulo no mesmo alvo de pelo menos 52 px. O vermelho sólido fica na confirmação; não usar vermelho para ações seguras.

### Chips

Filtros de extrato usam contorno e texto de apoio, altura mínima de 40 px e espaçamento horizontal de 14 px. A seleção combina fundo primário suave e contorno primário; a semântica acessível acompanha o estado.

`SegmentedControl` usa trilho neutro atenuado de 44 px, padding de 4 px e raio de 16 px; o indicador tem raio de 12 px, azul de marca e rótulo branco em ambos os temas. A mola existente permanece; pressionar a opção reduz opacidade a 0,65.

### Cards / Containers

`CreditCardSummary` usa superfície atenuada, raio local e padding de 12 px. Métricas, limite utilizado e divisórias seguem tokens semânticos. Cartões visuais das instituições preservam seus fundos de marca e artwork. `InstitutionLogo` mantém a base branca quando há imagem; falhas usam o ícone de banco.

`BalanceCard` destaca o saldo com azul saturado, raio de 24 px, padding de 20 px e gap de 8 px. Rótulo, valor e caption usam os pares de saldo; loading mantém skeleton. `FinancialMetric` repete verde/verde suave para entradas e coral/coral suave para saídas no Início e Extrato, com raio de 15 px, padding de 12 px, gap de 10 px e ícone direcional. Não deduzir novos dados ou estados da cor.

`HomeCreditCards` é uma restrição fixa: preservar a pilha sobreposta, sua geometria, desenho e todas as animações. Não recolorir artwork nem alterar algoritmos ou constantes das instituições.

### Category and icon identity

`CategoryBadge` suave usa background/foreground da categoria em listas densas; `vivid` usa accent/onAccent nas grades. O tamanho padrão é 38 px e o raio é 26% do tamanho. `CategoryFormScreen` repete o par sólido na prévia circular de 84 px. `TransactionDetailsLayout` usa categoria sólida na identidade e par suave na linha de categoria; o valor usa o par semântico da direção do dinheiro.

`IconTile` agrupa ícones em superfície suave por `tone`, com tamanho padrão de 42 px e raio de 30% do tamanho; o componente filho fornece a cor do ícone. Perfil usa primário para identidade, âmbar para senha e violeta para suporte. Perfil e edição usam avatar azul de saldo; alteração de senha repete âmbar.

### Inputs / Fields

`FormField` usa superfície atenuada e altura mínima de 54 px. O foco aplica superfície principal e contorno primário; erro aplica contorno e mensagem de erro. `useInputTheme` fornece placeholder, seleção, cursor e aparência do teclado. A web destaca controles com foco visível; o input cujo contêiner já destaca o foco não duplica o outline.

### Navigation

O navegador inferior agrupa Início, Extrato, Contas e Categorias, com o microfone central. O item ativo usa texto e ícone primários e uma pequena marca inferior; os demais usam cor secundária. Preservar nomes acessíveis e a adaptação para telas estreitas.

### Appearance

`AppearanceSettings` oferece Sistema, Claro e Escuro em Meu perfil. Cada opção tem nome, ícone e espaço reservado para a marca de seleção, evitando mudança de altura. O padrão segue o aparelho e reage às mudanças do sistema. A escolha persiste fora das sessões; só se aplica após salvar. Em falha, manter o tema atual e mostrar erro com possibilidade de tentar novamente. A troca não remonta rotas ou formulários.

### Confirmation and feedback

`ConfirmationDialog` controla confirmação, carregamento e erro, mantendo foco, Escape e redução de movimento do componente canônico. Enquanto a requisição está pendente, os controles ficam desabilitados. `ToastContext`/`Toast` apresentam sucesso. Manter a consequência da exclusão explícita e o erro dentro da confirmação; preservar a lista quando o servidor recusa a operação.

## Do's and Don'ts

### Do:

- Do reutilizar componentes, ícones e tokens semânticos existentes nos dois temas.
- Do preservar a geometria e a hierarquia tipográfica ao trocar a aparência.
- Do manter seleção nomeada e marca visível, além da cor.
- Do preservar logos, cores de instituições, artwork e todo o desenho e movimento da pilha sobreposta de cartões.
- Do usar accent/onAccent explícitos por tema em categorias vivid e os pares suaves em listas.
- Do manter as quebras responsivas de métricas e o ajuste de números longos.
- Do manter a consequência da exclusão explícita e o erro dentro da confirmação.
- Do preservar a lista se o servidor recusar a operação.

### Don't:

- Don't usar vermelho para ações seguras ou substituir texto/contorno semântico pelo azul fixo de marca no escuro.
- Don't diluir acentos de categoria escuros com branco ou alterar sua chave salva na API.
- Don't criar outra família de bordas, sombras ou animações para uma exclusão isolada.
- Don't usar diálogo nativo do navegador ou decoração extra nas ações financeiras.
- Don't remontar formulários ou associar a preferência de aparência à sessão de um perfil.
