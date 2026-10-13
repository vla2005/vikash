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
