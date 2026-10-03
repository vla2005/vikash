# Registro por voz

O botão central abre um drawer e inicia reconhecimento em `pt-BR`, com resultados parciais exibidos em tempo real. O texto começa vazio: não há fala simulada no app.

“Parar e revisar” interrompe a captura e aguarda o resultado final antes de abrir a revisão. É possível editar o texto e gravar novamente. Cancelar, fechar ou colocar o app em segundo plano interrompe a captura. Se a transcrição falhar, o texto já reconhecido pode ser revisado.

Não existe endpoint de análise conectado nesta etapa. `VoiceDrawer` aceita `onConfirm(text)` para integrar depois. Sem esse callback, confirmar mantém a revisão aberta e informa que a análise ainda não está disponível. Nenhum áudio é persistido pelo app nem enviado à API do Vikash.

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
- `components/VoiceWaveform.jsx`: barras animadas de atividade visual; não representam uma medição do volume do áudio.
- `hooks/useVoiceTranscription.js`: ciclo da captura, texto parcial, tempo, encerramento, erros e proteção contra eventos atrasados.
- `services/speechRecognition.js`: integração com o reconhecedor nativo.
- `services/speechRecognition.web.js`: integração com Web Speech API.

Os testes usam eventos controlados para verificar os estados, cancelamento, permissões e resultados parciais/finais. Builds e testes de interface não comprovam captura real em aparelho.
