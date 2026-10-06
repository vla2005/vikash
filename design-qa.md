# Design QA — editar perfil e alterar senha

Data: 2026-10-06.

## Fontes e evidências

- Referências: `output/design-concepts/perfil-editar-dados.png` e `output/design-concepts/perfil-alterar-senha.png`, ambas 853 × 1844.
- Implementações: `output/design-concepts/perfil-editar-implementado.png` e `output/design-concepts/perfil-senha-implementado.png`, ambas 390 × 844.
- Comparações lado a lado: `perfil-editar-comparacao.png` e `perfil-senha-comparacao-final.png` na mesma pasta. Referências normalizadas para o viewport CSS de 390 × 844, densidade 1, sem recorte.
- Estado final: edição com nome/e-mail de exemplo; senha preenchida com dados fictícios exclusivos da prévia sem integração, mascarados, campo Nova senha focado. A tela real inicia todas as senhas vazias.
- Prévia: `http://localhost:5173/verification/redesign/?profile`, dados ilustrativos isolados no arquivo de verificação ignorado. Sem alteração de sessões ou usuários reais.

## Histórico e correções

- P2: espaçamento inicial de senha empurrava Cancelar para fora do viewport principal. Evidência: `perfil-senha-antes-ajuste.png` e `perfil-senha-comparacao-inicial.png`. Nessa comparação os campos estavam vazios; somente a estrutura foi avaliada.
- Correção: diminuir margens, gaps e padding do rodapé, preservar alvos de toque de pelo menos 44 px e usar inputs de 52 px. Captura final mantém ambos os botões visíveis.
- P2: outline retangular do navegador duplicava a borda azul do FormField focado. Correção: identificar inputs com contêiner de foco e suprimir apenas o outline interno em CSS. Recaptura final comprova a borda única; feedback de foco do contêiner permanece.
- Após as correções e nova comparação, nenhum P0/P1/P2 pendente.

## Superfícies de fidelidade

- Fontes: Plus Jakarta Sans e pesos do app; header 21/28, título 32/41, texto secundário 17/25, campos 15. Pequenas diferenças de métricas do conceito gerado são P3 aceitáveis para consistência com o app.
- Ritmo: avatar de 84 px na edição, símbolo de 60 px na senha, campos brancos, CTA azul e cancelamento abaixo. Estrutura e hierarquia do conceito mantidas, com espaçamento ajustado para alvos de toque reais. Em 320 × 640 ambas as telas rolam e cancelar permanece acessível, sem overflow horizontal.
- Tokens: background #F4F7FC, texto #15244A, azul #2348EF, superfícies brancas e aviso #E8EDFF. Ausência do degradê do conceito intencional para respeitar o tema existente.
- Assets: iniciais dinâmicas e ícones Phosphor importados individualmente. Sem imagens raster novas no conteúdo das telas. Pequena diferença de contorno dos ícones é P3.
- Copy: títulos, instruções e CTAs do conceito preservados. Validação junto aos campos e aviso informativo para as ações ainda sem integração.

As comparações de 780 × 844 deixam os campos e botões legíveis; capturas adicionais de regiões não foram necessárias.

## Verificação funcional

- Navegador: abrir as duas telas pelo perfil, cancelar/voltar, mostrar/ocultar senha, validar campos vazios, editar campos fictícios na prévia, mensagem informativa ao salvar perfil e viewport compacto. Console sem erros na revisão.
- Telas recebem callback assíncrono `onSave`. Edição entrega `{name, email}` normalizados; senha entrega `{currentPassword, newPassword}` sem trim. A confirmação é local.
- MainTabs não fornece onSave por enquanto. Os formulários não chamam endpoints, não alteram o perfil da sessão e não salvam senhas em storage. Nenhuma simulação de sucesso.
- Callback preparado com bloqueio de duplicados, estado Aguarde, tratamento de fieldErrors, mensagem de erro e retry; sucesso e retorno ao perfil somente após resolução de um callback real.
- Validação: nome/e-mail, senha atual obrigatória, nova senha com pelo menos 8 caracteres, limite de 72 bytes UTF-8 conforme cadastro, diferente da atual, confirmação igual.
- Screen/FormField reutilizados para rolar o input focado quando o teclado abre. Teclado nativo não foi verificado em Expo Go neste ambiente.
- Suíte completa: 202 testes passaram, 29 suítes. Lint: zero erros e dois avisos preexistentes. Build Vite e bundles Expo/Metro web e Android passaram.

final result: passed
