# Vikash

Vikash é um aplicativo de finanças pessoais em português brasileiro, com valores em reais. O cliente usa React Native e Expo para Android e iOS; a prévia web usa React Native Web.

## Capacidades presentes

- Autenticação, cadastro, recuperação de senha e perfis salvos com sessões independentes.
- Contas financeiras, saldo, instituições, criação e edição de contas.
- Extrato, categorias, lançamentos, compras, cartões de crédito e faturas, incluindo pagamento e exclusão quando permitidos pela API.
- Dashboard com saldos, métricas e gráficos.
- Registro por voz com transcrição revisável enviada à API para criar lançamentos; suporte depende do navegador ou da build nativa.

## Compromissos de experiência

Priorizar leitura rápida de valores e ações claras. Preservar nomes, logos e cores das instituições; manter dados de perfis distintos isolados. Confirmações financeiras devem apresentar a consequência, o estado de carregamento e o erro sem perder os dados mostrados.

A identidade prateada oferece modos claro e escuro em todas as telas, escolhidos por um único toggle “Tema escuro” no perfil. Não há opção Sistema. O padrão é escuro; a escolha clara/escura fica salva no aparelho, é restaurada antes de montar o conteúdo e continua a mesma ao trocar perfis. Valores antigos “system” ou inválidos usam o padrão escuro. Falha ao salvar mantém o tema atual e informa o erro. A troca não remonta telas nem descarta campos ou sessões. “Ajuda e suporte” foi removido do perfil. A mesma linguagem neutra se inverte entre branco/carvão e preto/prateado. `src/theme/silver.js` concentra as paletas e efeitos; as cores das categorias e instituições continuam próprias.

A direção atual está em `SILVER-DESIGN.md`, substituindo a paleta anterior descrita em `.impeccable/surfaces/color-life.md`. A pilha sobreposta de cartões, seu desenho e todas as animações são uma restrição fixa; artwork e cores das instituições permanecem. Na gestão financeira, Contas mostra somente contas e Cartões mostra a pilha junto da lista comparativa de faturas e limites.

## Fontes e limites

Brief factual derivado de `README.md`, `UX-CONTRACT.md`, `src/services`, componentes e dos contratos aprovados em `.impeccable/surfaces/appearance.md` e `.impeccable/surfaces/color-life.md`. Não define novas funcionalidades ou público além de finanças pessoais. A revisão visual da aparência foi feita com React Native Web; bundles e configuração Android/iOS foram verificados, mas a conferência visual em aparelhos nativos continua necessária.


As animações seguem uma política permanente, aprovada pelo usuário: Reduzir movimento do sistema não muda animações, durações ou transições do app. A configuração compartilhada e os defaults nativos do Reanimated ficam em useReducedMotion e AppMotionPolicy. Encerrar uma captura, desmontar a tela e entrar em segundo plano continuam interrompendo recursos que não precisam executar; Reduzir transparência mantém seu comportamento independente.
