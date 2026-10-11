---
name: Vikash
description: Aplicativo de finanças pessoais com foco em leitura rápida de valores e ações claras.
colors:
  primary: "#2348EF"
  primaryPressed: "#1838CB"
  primarySoft: "#E8EDFF"
  background: "#F4F7FC"
  surface: "#FFFFFF"
  surfaceMuted: "#F0F4FC"
  text: "#15244A"
  secondary: "#626F85"
  border: "#DFE6F2"
  positive: "#13765A"
  positiveSoft: "#E6F5EE"
  negative: "#B43C4A"
  negativeSoft: "#F9E9ED"
  warning: "#815321"
  warningSoft: "#FFF0D9"
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
  dark-primary: "#9AB0FF"
  dark-primaryPressed: "#8299EF"
  dark-primarySoft: "#293858"
  dark-background: "#101727"
  dark-surface: "#1B2538"
  dark-surfaceMuted: "#243149"
  dark-text: "#F0F4FF"
  dark-secondary: "#B1BED4"
  dark-placeholder: "#A1AFC8"
  dark-border: "#3B4A64"
  dark-positive: "#7BDCB4"
  dark-positiveSoft: "#1C3D36"
  dark-negative: "#FFABB9"
  dark-negativeSoft: "#432B3B"
  dark-warning: "#F2CB8C"
  dark-warningSoft: "#443A2B"
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
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    rounded: "{rounded.button}"
    padding: "15px 20px"
  button-primary-dark:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-onPrimary}"
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
---

# Design System: Vikash

## Overview

**Creative North Star: "Leitura financeira clara"**

Interface de produto para consultar contas, compras e faturas no celular. Mantém a identidade já presente no dashboard: azul vivo, texto azul escuro no claro, superfícies claras ou azul-marinho no escuro e cartões arredondados. A linguagem é português brasileiro; valores são formatados em reais. A pilha de cartões concentra a expressão visual; ações financeiras priorizam clareza.

A aparência acompanha o sistema por padrão e oferece escolhas explícitas em Meu perfil. A troca mantém a organização, a tipografia, os ícones e a geometria existentes. O código canônico dos tokens é `src/theme/index.js`; categorias usam `src/theme/categoryPalette.js`. Este documento espelha o sistema implementado e não gera arquivos.

**Key Characteristics:**

- Leitura rápida de valores, com dígitos tabulares quando disponíveis.
- Azul semântico para ações e seleção; cores de marca preservadas nos cartões e logos.
- Superfícies arredondadas e hierarquia tonal consistente nos dois temas.
- Sistema, Claro e Escuro com seleção nomeada e marca visível.

## Colors

A paleta combina um azul de ação com neutros frios e pares semânticos legíveis sobre a superfície correspondente.

### Primary

- **Azul de ação:** `primary`, `primaryPressed` e `primarySoft` orientam ações e seleção no claro; seus pares `dark-*` cumprem os mesmos papéis no escuro. `onPrimary` acompanha a troca de fundo.
- **Azul de marca:** `brandPrimary`, `brandPressed` e `onBrand` permanecem fixos, como as cores das instituições financeiras. Não substituir o azul de ação pelo azul de marca em texto pequeno no escuro.

### Secondary

- **Verde financeiro:** `positive` e `positiveSoft` indicam valores ou estados positivos.
- **Rosa financeiro:** `negative` e `negativeSoft` indicam valores ou estados negativos.
- **Âmbar de aviso:** `warning` e `warningSoft` identificam avisos e estados de fatura.
- **Vermelho destrutivo:** `error` e `errorSoft` apresentam erros e a ação de excluir. A confirmação usa `dangerButton` com `onDanger`; esse par sólido permanece igual nos dois temas.
- Os pares `dark-*` preservam os significados. Categorias mantêm suas chaves e identidade de cor; no escuro, `categoryPalette` clareia o ícone e mistura o fundo com a superfície.

### Neutral

- **Canvas, painel e campo:** `background`, `surface` e `surfaceMuted`, com os respectivos pares escuros, separam o fundo da tela, cartões e campos.
- **Texto e apoio:** `text` e `secondary` distinguem informação principal e contextual. `secondary` também é o placeholder claro; `dark-placeholder` é específico para campos escuros.
- **Contorno:** `border` separa grupos, chips e indicadores, seguindo o tema.
- **Base de logo:** `logoSurface` permanece branca para preservar logos; os desenhos e cores dos cartões não são recoloridos pela aparência.

**The Semantic Pair Rule.** Usar o fundo e o texto do mesmo par semântico e do mesmo tema; marca, ação primária e ação destrutiva têm papéis separados.

## Typography

**Display Font:** Plus Jakarta Sans, já instalada; nenhuma nova família de display.
**Body Font:** Plus Jakarta Sans, pelo alias web `Vikash Sans, Arial, sans-serif` e pelos aliases nativos `VikashSans`, `VikashSansMedium` e `VikashSansBold`.

As definições web estão em `src/web/fonts.css`; o app nativo usa `useAppFonts`. A família e os pesos não mudam com a aparência. O tema compartilhado define título, corpo e rótulo; componentes especializados preservam suas variações existentes.

- **Title:** título principal do tema, em negrito e com espaçamento entre letras mais fechado.
- **Body:** leitura de apoio com entrelinha confortável e cor secundária.
- **Label:** rótulos de formulário, em peso médio.
- **Valores:** dígitos tabulares nos campos monetários e métricas que já os utilizam.

**The Stable Hierarchy Rule.** Trocar o tema altera as cores, preservando família, tamanho, peso e hierarquia das telas existentes.

## Layout

A interface mantém composição de celular com rolagem vertical e área segura. `Screen` centraliza um canvas de largura máxima de 460 px, com margem interna lateral de 24 px. Telas de detalhes preservam margens laterais de 22 px; Meu perfil usa 20 px. Não há escala global de espaçamento: manter a geometria do componente reutilizado.

O navegador inferior se adapta abaixo de 350 px, reduzindo margens, rótulos e espaço central do microfone. No web largo, o canvas continua centralizado. Drawers preservam largura máxima de 460 px; a confirmação usa no máximo 360 px e 90% da altura disponível. Rótulos de exclusão permanecem visíveis em telas estreitas, com texto e ícone no mesmo alvo de toque.

## Elevation & Depth

O sistema combina camadas tonais com sombras suaves nos cartões de marca e na navegação inferior. As sombras seguem a paleta e não mudam a geometria. A confirmação reutiliza `ConfirmationDialog`, com fundo escurecido independente do conteúdo; drawers usam o backdrop semântico do tema. Valores de sombra e backdrop ficam no sidecar.

`DrawerPanel` usa entrada por mola e `SegmentedControl` desloca seu indicador com mola. `useReducedMotion` aplica o estado final diretamente nesses movimentos. Não adicionar uma sombra ou animação diferente para uma única exclusão.

## Shapes

Campos e botões usam curvas suaves da família existente; painéis, folhas e confirmação ampliam essa mesma linguagem. Os raios normativos estão no frontmatter. Componentes existentes mantêm variações locais, como o grupo de perfil e aparência (22 px), o resumo de cartão (18 px) e o chip de filtro (13 px). Uma mudança de tema não cria uma nova família de bordas.

## Components

### Buttons

`PrimaryButton` combina ação e rótulo claros, com altura mínima de 54 px, espaçamento interno horizontal de 20 px e vertical de 15 px. A variante outlined mantém fundo transparente e contorno primário. Pressionar reduz opacidade e escala; carregamento mostra “Aguarde...” e bloqueia a ação.

`DeleteActionButton` é compartilhado por transações e faturas, com fundo suave de erro, ícone e rótulo no mesmo alvo de pelo menos 52 px. O vermelho sólido fica na confirmação; não usar vermelho para ações seguras.

### Chips

Filtros de extrato usam contorno e texto de apoio, altura mínima de 40 px e espaçamento horizontal de 14 px. A seleção combina fundo primário suave e contorno primário; a semântica acessível acompanha o estado.

### Cards / Containers

`CreditCardSummary` usa superfície atenuada, raio local e padding de 12 px. Métricas, limite utilizado e divisórias seguem tokens semânticos. Cartões visuais das instituições preservam seus fundos de marca e artwork. `InstitutionLogo` mantém a base branca quando há imagem; falhas usam o ícone de banco.

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
- Do preservar logos, cores de instituições e artwork dos cartões.
- Do manter a consequência da exclusão explícita e o erro dentro da confirmação.
- Do preservar a lista se o servidor recusar a operação.

### Don't:

- Don't usar vermelho para ações seguras ou azul fixo de marca como substituto do primário semântico.
- Don't criar outra família de bordas, sombras ou animações para uma exclusão isolada.
- Don't usar diálogo nativo do navegador ou decoração extra nas ações financeiras.
- Don't remontar formulários ou associar a preferência de aparência à sessão de um perfil.
