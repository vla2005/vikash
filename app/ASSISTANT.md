# Pergunte ao ViKash — frontend

## Fluxo e componentes

O dock abre `AssistantExperience`, sem iniciar captura de voz. A entrada usa o mesmo `Animated Input Bar` do Reacticx que o registro de transação. Há ações independentes para galeria, câmera e arquivos, remoção dos anexos antes de enviar, histórico, nova conversa e exclusão confirmada.

`AssistantIntelligence` usa o Apple Intelligence do Reacticx nos celulares. O shader é compilado apenas na primeira abertura; uma captura da tela é desfocada uma vez e animada na GPU. O conteúdo e a navegação continuam montados, mas ficam inacessíveis sob o overlay. O efeito para ao fechar, entrar no chat ou ir para segundo plano. A versão web usa um adaptador CSS com vidro e bordas animadas, sem carregar CanvasKit. Os adaptadores `index.web.tsx` do input e do gráfico somente reexportam suas implementações web, evitando que o Metro priorize o index.tsx nativo.

Depois do envio, o fundo fica #000000. Perguntas ficam em balões à direita e respostas em texto à esquerda, sem balão. A lista usa FlatList. O teclado tem compensação iOS/Android, e tocar fora do campo o dispensa. Escape fecha o assistente na web; Ctrl/Cmd+Enter envia, e Tab permanece no diálogo. No Android, voltar primeiro sai do histórico e depois fecha o assistente.

## Anexos e limites

- Até 5 arquivos por mensagem, 10 MiB por arquivo e 20 MiB no total.
- JPEG, PNG, WebP, HEIC/HEIF, PDF, TXT, CSV, XLSX e DOCX.
- Validação antes da cópia, incluindo tamanho real no armazenamento nativo.
- Câmera usa expo-image-picker; documentos usam expo-document-picker.
- A web usa os seletores do navegador. Em navegadores móveis, capture=environment oferece a câmera; no desktop, o navegador pode oferecer o seletor de imagens.
- Permissões são solicitadas somente ao tocar na ação. O plugin de imagens não adiciona permissão de microfone.
- Metadados de caminho local não aparecem no texto nem no envelope JSON do endpoint.
- São limites do cliente: o servidor deverá validar tamanho, tipo real, conteúdo e propriedade dos anexos novamente.

## Histórico local

`useAssistant` controla o estado; `assistantStorage` é a fronteira de persistência por perfil.

- Android/iOS: JSON e cópias de arquivos na pasta privada de documentos do app, fora do cache do seletor. URIs são reconstruídas a partir da pasta atual, preservando a referência depois de atualizações do iOS.
- Web: IndexedDB, incluindo os blobs, separado por perfil.
- Nenhum token é persistido no histórico.
- Perguntas são registradas antes da requisição; erros preservam texto/anexos e permitem retry com o mesmo ID.
- Fechar ou trocar de perfil cancela a requisição e ignora respostas atrasadas. Mensagens interrompidas voltam com opção de tentar novamente.
- Falha de leitura não substitui o arquivo salvo. Falha de gravação é visível; a conversa continua em memória. Falha na exclusão mantém o histórico e os anexos.
- Limites iniciais: 50 conversas, 200 mensagens por conversa, 6.000 caracteres por pergunta. O app informa o limite; não descarta turnos antigos silenciosamente.
- Não há sincronização entre aparelhos nesta fase. Remover os dados do app/navegador remove esse histórico local.

## Ativar o endpoint

O padrão é vazio. Sem endpoint, nenhuma requisição de IA é feita, a pergunta fica no histórico com um aviso de preparação e não há resposta simulada.

Defina no ambiente e reinicie/recompile o bundle:

```dotenv
EXPO_PUBLIC_ASSISTANT_PATH=/api/assistant/messages
# Vite pode usar a variável acima ou esta:
VITE_ASSISTANT_PATH=/api/assistant/messages
```

O caminho deve ser relativo à API já configurada (`API_BASE_URL`). URLs externas são rejeitadas para não encaminhar a autenticação a outra origem. Não coloque chaves do Gemini/OpenAI no frontend.

`assistantApi.sendAssistantMessage` usa `authenticatedFetch`, preservando renovação/cancelamento da sessão. O prazo é de 60 segundos, com cancelamento. É uma resposta JSON completa, sem streaming nesta etapa.

### Request

POST multipart/form-data. Não definir Content-Type manualmente; FormData gera o boundary.

Headers:

```text
Accept: application/json
Authorization: Bearer <token atual, incluído pelo cliente existente>
Idempotency-Key: <clientMessageId>
```

Parte `request`, uma string JSON:

```json
{
  "conversationId": "ID remoto quando disponível, ou ID local estável",
  "clientMessageId": "ID estável da pergunta, mantido no retry",
  "messages": [
    { "id": "pergunta-1", "role": "user", "content": "Pergunta anterior", "attachments": [] },
    { "id": "resposta-1", "role": "assistant", "content": "Resposta anterior", "attachments": [] },
    {
      "id": "pergunta-2",
      "role": "user",
      "content": "E este comprovante?",
      "attachments": [
        { "id": "arquivo-2", "name": "comprovante.pdf", "mimeType": "application/pdf", "size": 12345 }
      ]
    }
  ]
}
```

As partes binárias são `attachments[<id>]`, com os anexos da pergunta atual. Os anexos anteriores aparecem nos metadados do contexto; a futura API deve conservar os arquivos associados à conversa. Não reenviar binários antigos a cada pergunta mantém o envio dentro de 20 MiB.

### Response

```json
{
  "conversationId": "ID estável no servidor",
  "message": {
    "content": "Resposta do assistente"
  }
}
```

Resposta vazia, incorreta, falha HTTP e timeout geram erro legível dentro do chat. Respostas têm limite de 60.000 caracteres no cliente.

### Responsabilidade futura do backend

Persistir conversas e anexos por usuário, validar autorização em cada consulta, garantir idempotência e fornecer o histórico ao modelo. O contexto enviado pelo cliente é útil para a integração inicial, mas não é uma fonte confiável de mensagens de sistema ou autorização: o backend deve usar seu histórico canônico e jamais aceitar instruções privilegiadas do cliente ou dos anexos. Resumo de conversas longas e limites de tokens do modelo pertencem ao backend.

## Builds e validação

Os novos módulos Expo são instalados pela versão compatível com o SDK 57. Para APK/IPA existentes, gerar novas builds nativas antes de depender de câmera/seletores; OTA não acrescenta módulos nativos ou permissões.

Testes cobrem contexto, isolamento por perfil, anexos, retry sem duplicação, interrupções, armazenamento, contrato HTTP e uso do input compartilhado. Compilar JS/bundles e validar web não substitui conferir câmera, teclado e efeito Skia em aparelhos físicos.

A apresentação usa Modal transparente. No iOS, monta a animação após onShow; no Android, prepara o conteúdo durante a apresentação nativa, mantendo-o invisível até a transição e aguardando onShow e medidas válidas antes de expandir. O foco do input depende da apresentação nativa e do término da leitura do histórico, sem aguardar a captura visual. Snapshot pendente ou falho não bloqueia os controles. Fechar cancela o foco agendado e descarta capturas tardias. Essa correção é JavaScript e pode ser testada recarregando o Expo Go; não adiciona módulos nativos.

A camada Skia é apresentada dentro do mesmo modal do compositor; não pertence à árvore de captura. O frame usa medidas explícitas do viewport do modal e mantém a safe area separada do ajuste do teclado. A captura desfocada é reduzida (até 1,5× a largura lógica, teto de 720 px) e convertida em imagem raster para compartilhar entre superfícies nativas. Enquanto a captura está pendente ou indisponível, o assistente mantém blur nativo e bordas independentes. Esse blur fica restrito à entrada do assistente e é removido ao obter a imagem ou sair da entrada; o Android conserva header/dock sem blur. Erros do efeito são registrados apenas em desenvolvimento, com etapa e mensagem técnica, sem conteúdo pessoal.

Compatibilidade de layout: usar StyleSheet.absoluteFill. absoluteFillObject foi removido do React Native instalado e não deve ser usado nas camadas nativas. O toque fora do campo fecha o teclado sem fechar a conversa ou apagar texto; toques dentro do campo são preservados, inclusive quando o evento usa target numérico. A verificação usa as coordenadas do toque e measureInWindow; resultados atrasados não podem desfocar um toque posterior. O foco automático inicial é bloqueado após interação manual.


Assistente — teclado e retorno ao dock: a estrela e a mensagem inicial permanecem montadas com o teclado aberto. A mensagem conserva a posição e a tipografia definidas ao abrir; somente o compositor se aproxima dela em 280 ms ao receber foco; em alturas extremas, somente a mensagem pode rolar internamente. O compositor continua acima do teclado. Fechar mede o compositor e usa a posição real do botão do dock salva antes da abertura: o vidro encolhe, se desloca e revela o rótulo compartilhado em 560 ms, enquanto mensagem, borda e desfoque desaparecem. O botão original permanece visível até o primeiro layout do vidro animado e reaparece ao terminar o retorno, sem lacuna entre superfícies. Reanimated executa a transição nativa na UI; a web usa Web Animations/CSS, sem atualização React por quadro nem dependências novas. Fechamento repetido é ignorado; foco pendente e trabalho assíncrono são interrompidos ao iniciar a saída.

Validação desta interação: 667 testes em 89 suítes passaram; lint sem erros (um aviso anterior em StatementFilters), build Vite e exportações Expo Android/iOS/web concluídos. Testes cobrem mensagem com teclado nos dois SOs, espera pela conclusão da saída, cancelamento de foco e medidas do dock. Prévia web confirmou a transformação intermediária e o layout com altura reduzida. Teclado real e fluidez em aparelhos físicos ainda exigem conferência.


Abertura e fechamento usam AssistantDockMotion (adaptadores nativo/web) e a mesma geometria invertida. A entrada dura 680 ms e o foco ocorre somente após sua conclusão e após o carregamento. Nenhuma dependência foi adicionada. Validação: 671 testes em 89 suítes; lint sem erros, um aviso anterior em StatementFilters; build Vite e bundles Expo Android/iOS/web concluídos. Auditoria estática sem achados. Prévia web verificou origem no dock, expansão intermediária, fim no compositor com foco e largura de 320 px. Fluidez e teclado em aparelhos reais ainda dependem de conferência física.


Correções de estabilidade: handoff depois do layout nativo, progresso reversível sem zerar a opacidade do conteúdo, mensagem ancorada e campo que se aproxima no foco, canvas integral e normalização entre app/modal. MainTabs mede botão e frame em conjunto. A geometria relativa preserva a distância inferior mesmo com origens/alturas diferentes no Android. Na web, retorno preserva o frame anterior ao teclado e foco só é restaurado ao sair do overlay. Validação: 679 testes/89 suítes passaram; lint sem erros (um aviso anterior), Vite e bundles Expo Android/iOS/web concluídos. Na prévia com altura reduzida, o título manteve y=118 e o campo terminou acima da área do teclado. Conferência nos aparelhos reais permanece necessária, principalmente do destino do dock Android.

No fechamento nativo, a âncora do botão é medida novamente enquanto ele permanece oculto, para incorporar a posição final de um dock que ainda estava recolhendo ao abrir. A distância às bordas é projetada no canvas integral, mesmo com o teclado ainda visível. A web usa a âncora anterior ao filtro CSS e a altura anterior ao teclado.


## Diagnóstico de abertura no Android

O relato atual é de atraso em todas as aberturas. A compilação CPU do shader já é cacheada; não atribuir o atraso recorrente a ela sem medidas. A captura do fundo continua ocorrendo a cada entrada e é uma hipótese a medir: o Skia instalado captura a árvore nativa em resolução integral antes da redução do buffer. A validação inicial não tinha medições físicas; os resultados posteriores pela USB estão registrados abaixo.

O Android prepara o conteúdo enquanto o Modal é apresentado, sem esperar onShow para começar a montagem. A apresentação e o layout continuam sendo pré-condições para expandir o vidro. O placeholder inicia como um único Text com o mesmo conteúdo, evitando dezenas de views/worklets por caractere durante a montagem oculta; após o primeiro foco, as animações habituais voltam ao perder foco. iPhone e web conservam seu comportamento. Não foram alterados o shader, os tempos de morph nem dependências.

No Expo Go Android em desenvolvimento, cada abertura produz um único console.info com prefixo [ViKash assistant startup]. stagesMs informa tempos acumulados desde o toque: dock-measured, modal-shown/modal-layout, entry-layout-ready, geometry-ready, first-flight-layout, shader-start/shader-ready, capture-start/capture-ready, background-ready, input-revealed e keyboard-shown, conforme ocorram. Comparar as diferenças entre etapas para identificar o bloqueio; as etapas de captura e apresentação podem se sobrepor. O relatório é encerrado ao mostrar teclado, após 1,5 s sem teclado depois da entrada, ou ao fechar. Não registra texto, anexos, pixels, autenticação ou identificadores; é desativado em produção, iOS e web e não escreve logs por quadro.

Validação desta otimização: 685 testes/90 suítes passaram; lint sem erros, com um aviso anterior em StatementFilters; build Vite e exportações Expo Android/iOS/web concluídas. Testes verificam montagem antecipada Android ainda oculta, espera pela apresentação nativa para expandir/focar, placeholder leve inicial e restauração da animação, isolamento do iOS e diagnósticos com descarte de timers. Confirmar o tempo real recarregando o Expo Go no aparelho Android.


## Captura e montagem Android — medição no aparelho

O adaptador src/services/assistantCapture.android.js usa react-native-view-shot 5.1.0, recomendado pelo Expo SDK 57 e incluído no Expo Go. O módulo desenha a árvore nativa e devolve PNG sem perda em memória. A redução acontece antes da transferência para JavaScript, usando a mesma densidade do buffer desfocado (até 1,5× a largura lógica, teto de 720 px, sem ampliar telas de baixa densidade). Não há arquivos de captura em disco, cache de telas antigas nem pixels/base64 nos logs. Falha ou módulo ausente mantém makeImageFromView como retorno compatível.

O Android aplica o mesmo blur e shader sobre uma superfície raster Skia, evitando criar textura offscreen e copiá-la de volta à CPU para atravessar a janela do Modal. A imagem raster permanece viva até a saída e é descartada na troca/desmontagem; imagens que chegam depois de fechar são descartadas. O BlurView de reserva só monta quando a transição pode mostrá-lo. Criá-lo durante o layout oculto adicionava trabalho antes da expansão. As durações, bordas coloridas, distorção, geometria, teclado e retorno ao dock continuam iguais.

O iOS conserva makeImageFromView, superfície GPU e makeNonTextureImage. react-native-view-shot é excluído do autolinking iOS em package.json; a configuração nativa foi conferida: presente no Android, ausente no iOS. A web mantém seu adaptador CSS.

Medições pelo ADB em um C61 Pro, Expo Go em desenvolvimento, em 15/10/2026: registro anterior de 3.094 ms até teclado, captura de 1.014 ms e processamento de 145 ms. Com o novo desenho nativo, as reaberturas observadas ficaram em 1.432–1.505 ms; o primeiro layout do painel ficou em 284–293 ms e o primeiro layout do vidro animado em 501–515 ms (antes 874 e 2.237 ms). A comparação final com PNG mediu captura/leitura de 358 ms, processamento de 100 ms e teclado aos 1.445 ms. RAW foi descartado: só converter a cadeia de pixels custava 130–151 ms, contra 20 ms para a imagem PNG reduzida.

A primeira abertura após recarregar o Expo ainda mediu 2.699 ms no ensaio com o novo desenho nativo e RAW; o primeiro layout, nesse ensaio, consumiu 1.027 ms. Não há medição final fria equivalente com PNG nem garantia de que o custo inicial foi eliminado. Os dados são amostras deste aparelho em desenvolvimento, não um benchmark de release ou FPS. A tentativa de antecipar a captura para o toque foi retirada: disputou a thread UI com o Modal e piorou a reabertura no ensaio (1.809 ms). A implementação final captura depois do primeiro layout e mantém a animação independente da conclusão da imagem.

Para testar agora, basta recarregar o Expo Go. Para incorporar a captura nova no APK próprio, gerar uma nova build Android; OTA em um APK sem RNViewShot usa o retorno compatível. Não é necessária nova build iOS por esta otimização.

Validação: 691 testes em 91 suítes; testes incluem redução sem ampliação, PNG sem perda, liberação de dados/imagens, captura rejeitada, APK antigo sem módulo, superfície raster Android sem readback, blur de reserva somente quando visível e preservação do caminho iOS. Lint sem erros (um aviso anterior em StatementFilters); Vite e exports Expo Android/iOS/web concluídos. expo install --check confirmou view-shot compatível e apontou cinco atualizações patch já disponíveis para dependências anteriores do Expo; não foram aplicadas nesta tarefa.


## Cache e PixelCopy no Android

O caminho preferencial agora � o m�dulo Expo local `modules/vikash-capture`, exclusivo do Android. Ele usa PixelCopy (API 26+) para copiar os pixels j� renderizados da janela do app, limitada ao frame do alvo. O Modal do assistente � outra janela e n�o entra na captura. A solicita��o � ass�ncrona; a c�pia para bytes ocorre em HandlerThread, sem `view.draw()` recursivo, PNG, base64 ou arquivos tempor�rios. Os bytes RGBA chegam pelo conversor Uint8Array do Expo e alimentam a imagem raster Skia. A resolu��o, blur, shader e apar�ncia permanecem os mesmos. Nenhuma permiss�o nem pacote npm novo foi necess�rio.

O m�dulo observa a geometria do alvo e os eventos nativos de scroll. Notifica��es globais causadas apenas pela abertura/fechamento do Modal ou teclado n�o mudam a revis�o quando os limites do alvo continuam iguais. Isso evita invalidar o cache em toda reabertura. A prepara��o do m�dulo, observador e shader ocorre no per�odo ocioso ap�s montar a tela, antes do primeiro toque, sem capturar antecipadamente uma tela que pode mudar.

O cache Android guarda uma �nica imagem j� desfocada em mem�ria por at� 30 segundos. A chave inclui perfil/tela/tema, dimens�es, escala de fonte e revis�o nativa. Troca de contexto, altera��es de dimens�es, scroll, intera��o com a tela original, respostas da API, commits do conte�do/toasts, logout e sa�da do app invalidam a entrada. O pr�prio bot�o do assistente � exclu�do da invalida��o por toque. A gera��o impede conservar um resultado que ficou desatualizado durante uma captura. Refer�ncias separadas para cache e painel impedem liberar uma imagem ainda exibida; expira��o ou invalida��o libera a mem�ria depois do �ltimo uso. Nenhuma imagem � persistida ou enviada � API.

No Expo Go e em APKs antigos sem o m�dulo local, o app usa o adaptador anterior (view-shot PNG, ou Skia se indispon�vel), com o mesmo cache e invalida��es JavaScript. Para usar PixelCopy � necess�ria nova build Android com `expo prebuild`; OTA n�o instala o m�dulo. O fluxo j� existente `npm run build:android:apks` executa esse prebuild. O m�dulo local � exclu�do de iOS por sua configura��o de plataformas; o iPhone conserva sua captura GPU e n�o usa este cache. A web conserva CSS.

Valida��o automatizada: 704 testes em 94 su�tes passaram; lint sem erros (permanece o aviso anterior de maxHeight em StatementFilters), Vite e exporta��es Expo Android/iOS/web conclu�dos. O m�dulo Kotlin compilou e o APK debug ARM64 foi instalado como `com.vikash.capturetest`, separado de `com.vikash`, no C61 Pro pela USB. Testes cobrem propriedade e descarte das imagens, expira��o, corridas de invalida��o, isolamento de chaves, metadados/revis�es e retorno compat�vel se a captura nativa falhar.

Medi��o f�sica de 15/10/2026, debug com Metro, depois de estabilizar o servidor: primeira abertura ap�s reiniciar o processo levou 2.516 ms at� o teclado, com PixelCopy de 110 ms, leitura Skia de 37 ms e blur de 107 ms. Outra captura sem cache levou 71 ms no PixelCopy e 81 ms no blur. Duas reaberturas consecutivas registraram `background-cache-hit`, sem nova captura nem blur: 1.672 e 1.696 ms at� o teclado, com o primeiro layout animado aos 673 e 653 ms. Esses totais incluem a expans�o de 680 ms e o teclado. A prepara��o do shader n�o adicionou tempo observ�vel nessas amostras. A montagem/apresenta��o inicial do Modal continua sendo um custo relevante: n�o se deve afirmar que toda a lat�ncia ou o custo da primeira abertura foi eliminado. Os resultados de debug neste aparelho n�o s�o garantia de FPS ou benchmark de release.


O ensaio USB tamb�m verificou as sequ�ncias: ap�s scroll, captura nova (1.981 ms), reabertura na mesma posi��o com cache (1.754 ms) e retorno do segundo plano com captura nova (2.722 ms; 1.256 ms somente at� layout do Modal). Outro ciclo, conclu�do dentro de 30 segundos, registrou captura nova, cache e nova captura depois de ocultar valores: 1.827, 1.701 e 1.849 ms. A imagem desfocada ap�s ocultar valores n�o conservou os n�meros anteriores. Visibilidade de valores foi restaurada ao terminar. Os logs transit�rios foram removidos.

O prebuild usado no teste sincronizou o projeto Android com o template Expo instalado, incluindo autolinking dos m�dulos locais. Esses arquivos gerados foram conservados: a revis�o autom�tica recusou a restaura��o ampla por risco de descartar altera��es locais. O applicationId de teste foi aplicado somente por um init script Gradle ignorado em build/, sem mudar o identificador com.vikash do projeto. Nenhum arquivo nativo iOS foi alterado.


## Montagem progressiva do painel Android

A entrada vazia no Android mede primeiro uma estrutura leve e invis�vel, usando os estilos e a altura m�nima exportados pelo pr�prio AssistantComposer. O cabe�alho reserva a medida da Action compartilhada. Quando o vidro recebe seu primeiro layout nativo, o painel monta o input, a mensagem inicial e os controles, ainda durante a metade transparente da expans�o. Rascunhos, anexos, erros, aus�ncia de perfil e fontes do sistema ampliadas seguem a montagem completa para respeitar suas medidas din�micas. N�o h� c�pia paralela do formul�rio, descarte de rascunhos ou altera��o da dura��o de 680 ms.

O provider prepara os uniforms Android enquanto o app est� ocioso e reaplica somente quando a configura��o muda. Captura e Canvas ficam fora do layout inicial invis�vel, liberando a medi��o do painel e o come�o da transforma��o. O cache e o PixelCopy da etapa anterior permanecem, assim como o blur de reserva e os efeitos. iPhone e web mant�m o caminho de apresenta��o e captura anterior. Esta etapa modifica somente JavaScript/TypeScript, sem depend�ncias ou m�dulos nativos novos; pode ser testada recarregando Expo Go, que mant�m seu adaptador de captura compat�vel. A necessidade de um APK novo para PixelCopy continua sendo a da etapa anterior.

Medi��o USB de 15/10/2026, C61 Pro Android 15, APK de teste debug separado e Metro: numa sequ�ncia de tr�s aberturas com o dashboard carregado, o layout do Modal ocorreu em 201�215 ms, a transforma��o recebeu seu primeiro layout em 397�408 ms e o teclado apareceu em 1.623 ms sem cache, 1.438 e 1.468 ms com cache. As reaberturas anteriores no mesmo aparelho tinham layout do Modal em 392�396 ms, primeiro layout da transforma��o em 653�673 ms e teclado em 1.672�1.696 ms. S�o amostras de desenvolvimento, com varia��o de carga e estado do aparelho; n�o s�o medidas de FPS ou promessa de lat�ncia fixa. Em outra abertura ap�s voltar ao app, houve 728 ms at� o primeiro layout da transforma��o e 2.135 ms at� teclado, mostrando que a montagem nativa ainda varia. O ensaio de rein�cio com o HUD de avisos bloqueando os toques foi descartado e n�o sustenta compara��o fria.

Inspe��o no aparelho confirmou composi��o final, teclado acima do input, mensagem inicial est�vel e retorno ao dock. Tocar fora fechou o teclado; Back durante a expans�o encerrou a apresenta��o sem mostrar teclado depois. N�o houve chamada ao endpoint do assistente nem altera��o de dados financeiros. A c�pia principal do app foi preservada. Os testes automatizados cobrem tamb�m fontes ampliadas, rascunhos, prepara��o ociosa, espera pelo primeiro layout do vidro, cancelamento e compatibilidade iOS.

Valida��o desta etapa: 709 testes em 94 su�tes; lint sem erros, permanecendo o aviso anterior de maxHeight em StatementFilters. O detector Impeccable apontou somente tr�s avisos de cores j� presentes no assistente (�mbar aprovado pelo usu�rio e seu tom de apoio), que foram mantidas para preservar a identidade visual. Nenhuma instru��o de redu��o de movimento foi adicionada.

Build Vite e exporta��es Expo Android/iOS/web conclu�dos nesta etapa. O diff passou em git diff --check. O servidor separado foi encerrado e as configura��es de tela e USB foram restauradas.
