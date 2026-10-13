# Registro por voz

O botão central abre um drawer e inicia reconhecimento em `pt-BR`, com resultados parciais exibidos em tempo real. O texto começa vazio: não há fala simulada no app.

“Parar e revisar” interrompe a captura e aguarda o resultado final antes de abrir a revisão. É possível editar o texto e gravar novamente. Cancelar, fechar ou colocar o app em segundo plano interrompe a captura. Se a transcrição falhar, o texto já reconhecido pode ser revisado.

A confirmação envia somente a transcrição revisada para `/api/transaction/create`. Nenhum áudio é persistido pelo app nem enviado à API do Vikash. Falhas ficam dentro do drawer, preservando o texto. Os códigos VOICE_INFORMATION_REQUIRED e VOICE_INPUT_INVALID geram aviso amarelo com orientações por campo em missingFields/fieldErrors. VOICE_ANALYSIS_UNAVAILABLE, rede e demais falhas técnicas geram aviso vermelho. Respostas legadas usam HTTP 400/422 como fallback. É possível editar, regravar ou tentar novamente. Apenas o sucesso emite toast e fecha o drawer. Sem o callback `onConfirm(text)`, a revisão permanece aberta com aviso de indisponibilidade. O contrato está descrito em backend/VOICE_ANALYSIS.md. O drawer traduz accountUuid para "Conta ou banco" e paymentMethod para "Forma de pagamento", mostrando apenas os campos retornados.

## Navegador

Use `npm run web` e abra a página no Chrome ou Edge. Autorize o microfone quando solicitado. O reconhecimento depende do suporte e das permissões do navegador; em outro dispositivo, o acesso ao microfone também depende de uma origem segura (HTTPS).

## Celular

O reconhecimento usa `expo-speech-recognition`, configurado em `app.json` com as permissões de microfone e transcrição. Esse módulo não faz parte do Expo Go. O drawer continua acessível no Expo Go, mas mostra a indisponibilidade da captura.

Para executar a captura real no Android, é necessário Android Studio/SDK e uma build própria. Dentro da pasta `app`, sincronize primeiro o projeto nativo com a configuração Expo, pois as pastas nativas originais vieram do Community CLI:

```powershell
npx expo prebuild --platform android
npx expo run:android
```

Para iOS, use os equivalentes `--platform ios` e `run:ios` em um Mac com Xcode. É necessário recompilar o app quando adicionar ou alterar módulos nativos ou suas permissões.

## Organização

- `components/VoiceDrawer.jsx`: escuta, revisão editável, fundo escurecido e confirmação.
- `components/ListeningOrb` e `components/ListeningWave`: esfera deformável e ondas durante a captura.
- `components/VoiceMicButton`, `VoiceMicPulse` e `VoiceMicGlyph`: controle de gravação, luzes e transição entre microfone e confirmação.
- `hooks/useVoiceTranscription.js`: ciclo da captura, texto parcial, tempo, encerramento, erros e proteção contra eventos atrasados.
- `services/speechRecognition.js`: integração com o reconhecedor nativo.
- `services/speechRecognition.web.js`: integração com Web Speech API.

Os testes usam eventos controlados para verificar os estados, cancelamento, permissões e resultados parciais/finais. Builds e testes de interface não comprovam captura real em aparelho.

No React Native 0.86, camadas sobrepostas usam StyleSheet.absoluteFill: absoluteFillObject não existe. A cena reserva uma região para a transcrição e calcula o tamanho da esfera pela altura medida, conservando cabeçalho/rodapé. No iOS/Android, a esfera usa um shader Skia de uma passagem, limitado ao seu canvas, com antialias analítico e uniforms animados pelo Reanimated. A malha é calculada na GPU, sem construir strings SVG por quadro; o shader é compilado uma vez. Se o compilador gráfico falhar, uma ilustração estática mantém o fluxo utilizável. As ondas nativas usam paths Skia com 24 colunas e 5 linhas: 32 poses pré-calculadas por ciclo e interpolação nativa. O frame não calcula trigonometria, não monta strings SVG e não dispara render React. As poses são reutilizadas entre aberturas do drawer. A web conserva seu renderer SVG e não carrega CanvasKit. Os efeitos continuam na UI thread e pausam fora da captura/primeiro plano. Durante o drawer de voz, os efeitos e desfoques cobertos da tela principal ficam suspensos; o texto parcial/final do serviço nativo é preservado para revisão e confirmação.

A dependência @shopify/react-native-skia segue a versão compatível indicada pelo Expo (2.6.2 no SDK 57). É necessário gerar uma nova build nativa após esta migração; atualizar apenas o JavaScript de um APK/IPA antigo não instala o módulo. Testes rasterizam o shader com o Skia/CanvasKit real em ambos os temas e verificam contorno, variação e continuidade do ciclo; isso não substitui medir FPS em uma build release no aparelho Android mais lento e no iPhone.

Os testes de interpolação usam Skia real e verificam erro inferior a 0,5 pixel em relação à curva anterior, bordas e continuidade. A medição local de 3.000 frames comparou geração/parsing SVG (431 ms) com interpolação nativa via CanvasKit (9,5 ms); é um benchmark de CPU em Node, não uma medição do renderer Android nem uma previsão de FPS.
