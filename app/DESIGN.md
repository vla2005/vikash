---
version: alpha
name: Vikash
description: Aplicativo de finanças pessoais com foco em leitura rápida de valores e ações claras.
colors:
  primary: "#2348EF"
  background: "#F4F7FC"
  surface: "#FFFFFF"
  text: "#15244A"
  secondary: "#66738B"
  error: "#A3322C"
  errorSoft: "#F9EDEA"
typography:
  sans:
    fontFamily: "Vikash Sans, Arial, sans-serif"
rounded:
  button: "16px"
  panel: "24px"
omitted:
  - section: spacing
    reason: A geometria varia conforme o componente; não há escala global de espaçamento.
components:
  DeleteActionButton:
    backgroundColor: "{colors.errorSoft}"
    textColor: "{colors.error}"
    rounded: "{rounded.button}"
  ConfirmationDialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
---

# Identidade visual do Vikash

## Overview

Interface de produto para consultar contas, compras e faturas no celular. Mantém
a identidade já presente no dashboard: azul vivo, texto azul escuro, superfícies
brancas e cartões arredondados. A linguagem é português brasileiro; valores são
formatados em reais. A pilha de cartões concentra a expressão visual; ações
financeiras priorizam clareza.

O código canônico dos tokens é `src/theme/index.js`. Este documento espelha esses
valores e não gera arquivos. As fontes são definidas em `src/web/fonts.css` e nos
hooks `useAppFonts`; no app nativo, são VikashSans, VikashSansMedium e VikashSansBold.

## Colors

Use as cores semânticas do tema. Exclusão usa `colors.error` e `colors.errorSoft`;
o botão vermelho sólido fica na confirmação. Não usar vermelho para ações seguras.

## Typography

Use a família Plus Jakarta Sans já instalada, pelos aliases do tema. Valores usam
dígitos tabulares quando disponível. Preserve os títulos e subtítulos das contas.

## Layout

As telas de detalhes usam rolagem vertical e margens laterais de 22 px. A ação de
excluir fatura fica abaixo das datas, dentro do painel da fatura. Texto e ícone
compartilham o alvo de toque; o rótulo completo permanece visível em telas estreitas.

## Elevation & Depth

A confirmação reutiliza `ConfirmationDialog`, com fundo escurecido independente
do conteúdo. Não adicionar sombras ou animações diferentes para uma única exclusão.

## Shapes

Botões têm raio de 16 px; painéis, 24 px. A confirmação mantém o raio de 28 px do
componente compartilhado. Não criar outra família de bordas para esse fluxo.

## Components

`DeleteActionButton` é o botão de exclusão compartilhado por transações e faturas.
`ConfirmationDialog` controla a apresentação de confirmação, carregamento e erro.
`ToastContext`/`Toast` apresentam o sucesso. Durante a requisição, os controles
ficam desabilitados e a confirmação mostra “Aguarde…”. A redução de movimento
segue `useReducedMotion`.

## Do's and Don'ts

- Reutilizar os componentes, ícones e tokens existentes.
- Manter a consequência da exclusão explícita e o erro dentro da confirmação.
- Preservar a lista se o servidor recusar a operação.
- Evitar diálogo nativo do navegador e decoração extra nas ações financeiras.
