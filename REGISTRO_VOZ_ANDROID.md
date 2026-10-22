# Registro financeiro por voz no Android

## Arquitetura e fluxo

O app usa Expo SDK 57, React Native 0.86, JavaScript, Skia/Reanimated e módulos
Kotlin locais. A API usa Spring Boot/Java 21, JPA/Hibernate e PostgreSQL.
O aplicativo não usa outro banco financeiro nem outro interpretador de IA.

1. O tile **Registrar Gasto** usa `TileService`. Android 14+ recebe um
   `PendingIntent` imutável em `startActivityAndCollapse`; versões anteriores
   usam a sobrecarga `Intent`. Em tela bloqueada, `unlockAndRun` exige desbloqueio.
2. Abre `VoiceEntryActivity`, Activity translúcida em uma tarefa separada,
   excluída dos recentes. Ela renderiza a raiz `VikashVoiceEntry`, sem dashboard,
   navegação principal ou splash React do app. Não há `SYSTEM_ALERT_WINDOW`,
   serviço permanente, foreground service ou captura oculta.
3. O mesmo `OnboardingProvider` valida/renova a sessão. Quando já existe outra
   raiz React, ambas compartilham um único proprietário da sessão para evitar
   duas rotações concorrentes de refresh token. Credenciais continuam no
   armazenamento seguro existente. Não há implementação de biometria a contornar
   no fluxo atual. Uma sessão inválida impede captura/confirmação e oferece
   abrir o app para autenticar; depois basta tocar novamente no atalho.
4. No primeiro uso por perfil, o usuário escolhe explicitamente se aceita o
   processamento descrito na tela. A escolha versionada é salva no SecureStore.
   Nas próximas aberturas, a escuta começa após validar a sessão e montar a UI.
5. A captura reutiliza `useVoiceTranscription` e `expo-speech-recognition`, em
   português, sem persistir áudio. Durante a escuta normal aparece somente o
   `ListeningOrb` existente. O serviço Android encerra ao concluir a fala;
   tocar no orbe também encerra. Limite de 45 segundos; ao sair, libera o microfone.
   Em falha do modelo local, Regravar permite usar o serviço padrão do celular.
6. Após a fala, aparecem a transcrição e três ações: **Confirmar**, **Regravar**
   e **Abrir app** (menor). Antes de tocar em Confirmar, nenhuma análise
   é enviada à API ou ao Gemini. Confirmar inicia `POST /api/transaction/preview`
   e, se os dados forem válidos, envia a confirmação para salvar na mesma ação.
   O botão só apresenta loading após o toque. Campos ausentes ou inválidos
   bloqueiam o registro; é possível regravar ou abrir o app para completar.
7. Não há formulário, cabeçalho ou botão Analisar na superfície compacta normal.
   Regravar cancela a análise em andamento e invalida respostas antigas. Abrir
   app cancela a captura e retorna à navegação principal, sem salvar.
8. **Confirmar** envia os dados validados para
   `POST /api/transaction/confirm-reviewed`. O backend aplica as validações
   existentes, revalida contas, cartões e categorias do usuário autenticado e
   mantém o recibo idempotente para impedir duplicidade. Nenhum registro é salvo
   ao terminar a fala. Somente o toque em Confirmar autoriza analisar e salvar.
9. Após commit confirmado, notifica as telas já montadas para atualizar saldo,
   extrato e cartões. Mostra sucesso e encerra a Activity, retornando ao contexto
   anterior. Se o app estava fechado, as telas consultarão o servidor ao abrir.

O atalho registra **receitas e despesas**. Transferências entre contas e pagamentos
de fatura continuam nos fluxos existentes do app. Não efetua pagamentos nem
movimenta dinheiro em instituições bancárias.

## Duplicidade e tabela técnica

Há uma única nova tabela técnica: `voice_entry_receipts`, com usuário, UUID da
confirmação, SHA-256 do conteúdo e data. Ela não contém transcrição, áudio,
saldo ou outra cópia da movimentação. Hibernate cria essa tabela na inicialização
com o `spring.jpa.hibernate.ddl-auto=update` já configurado no projeto. Não é
necessário executar SQL manual no Coolify para esse recurso. O usuário da API
precisa continuar com as permissões de DDL usadas pelo Hibernate.

O backend bloqueia o usuário durante a confirmação e grava recibo e lançamento
na mesma transação. Repetir a mesma chave e conteúdo retorna sucesso sem gravar
de novo; a mesma chave com outro conteúdo é rejeitada. A restrição única no banco
e o bloqueio funcionam também entre instâncias da API.

Antes de enviar, o frontend guarda uma confirmação pendente **criptografada no
SecureStore e separada por perfil**. Se houver timeout, queda do processo ou
resposta perdida após commit, a próxima abertura oferece **Verificar registro**
com exatamente o mesmo UUID/conteúdo. Não apresenta a operação incerta como
fracasso definitivo, não permite editar/recriar esse pedido e não apaga o pedido
ao fechar. Uma rejeição de validação permite editar antes de reenviar. Não há
fila automática de novos gastos offline.

## Integração nativa e CNG

- `app/modules/vikash-voice-entry/`: módulo Expo Android, serviço do tile,
  manifesto, tema translúcido e ícone vetorial monocromático.
- `app/plugins/voice-entry/VoiceEntryActivity.kt`: fonte canônica da Activity.
- `app/plugins/withVoiceEntryShortcut.js`: gera a Activity no módulo principal,
  XML do atalho do launcher e metadados do MainActivity. O app continua iniciando
  normalmente pelo seu ícone. O atalho do launcher chama **Registrar por voz**.
- `app/app.json` registra o config plugin. O módulo Expo é descoberto pelo
  autolinking de módulos locais. Nenhum pacote npm novo foi instalado.
- `app/index.js` registra a raiz adicional apenas no Android, com importação
  adiada. iPhone e web continuam com a raiz normal.
- `app/src/screens/VoiceEntryRoot.jsx`: interface compacta, estados, consentimento,
  transcrição, revisão, confirmação e cancelamento.
- `app/src/services/voiceEntry*.js`: endpoints, pendências seguras e ponte nativa.
- `app/src/services/onboardingBridge.js` e `OnboardingContext.jsx`: sessão única
  entre raízes Android; iOS/web mantêm o proprietário normal.
- `app/src/services/financialChanges.js` e `MainTabs.jsx`: invalidação após salvar.
- `app/src/utils/voiceEntry.js`: validação do formulário e valores decimais exatos.
- `ProfileScreen.jsx`/`VoiceEntryTileSettings.jsx`: adicionar tile no Android.
- `speechRecognition.js`/`useVoiceTranscription.js`: opção de reconhecimento
  local exclusiva do atalho; as opções padrão do drawer existente permanecem.
- API: `VoiceEntryController`, `ReviewedTransactionService`,
  `ReviewedTransactionRequest`, `VoiceEntryReceiptEntity/Repository` e métodos
  `preview`/`saveReviewed` do `TransactionService`.
- Testes: `voiceEntry*.test.*` e `ReviewedVoiceEntryIntegrationTest`.

O orbe é o `ListeningOrb` existente; não foi copiado outro componente do Reacticx.
Entrada, saída e reposicionamento usam Reanimated com transform/opacity na UI thread.
O shader pausa ao sair do primeiro plano ou ativar Reduzir movimento. O atalho respeita Reduzir movimento, inclusive mudanças durante
o uso, sem alterar a política global de animações do app.

## Permissões e privacidade

- `RECORD_AUDIO` solicitado em runtime, com Activity visível.
- `BIND_QUICK_SETTINGS_TILE` protege a vinculação ao serviço do tile.
- `INTERNET` já existente para a API/Gemini e eventual reconhecedor remoto.
- `FLAG_SECURE`, exclusão dos recentes e verificação do bloqueio protegem a UI.
- A Activity encerra ao sair; não mantém gravação no fundo.
- Não adicionar `SYSTEM_ALERT_WINDOW`, permissões de armazenamento ou credenciais
  no código. Não registrar transcrições/tokens em logs para depuração.

## Build local de 21/10/2026

- Android versionCode 16, pacote `com.vikash`, ARM64 e assinatura de produção existente.
- Ícone vetorial monocromático do tile extraído da logo original do app.
- Fundo translúcido com gradiente; blur nativo em Android 12+ quando suportado pelo sistema.
- 56 testes direcionados e 809 testes do app aprovados; sem requisições reais ao Gemini.
- A API precisa do rebuild com os endpoints de voz. A geração do APK não publica a API.

## Compilar e testar

É necessária **nova build Android**. Expo Go e OTA sozinhos não instalam TileService,
Activity, recursos de manifesto ou módulo nativo. Não é necessária build iOS para
usar o atalho Android. A API deve ser rebuildada com os endpoints novos.

Na raiz do projeto, para verificar a API:

```powershell
cd backend
mvn -B -ntp test
```

Use JDK 21 para a API; os testes usam H2 isolado e Gemini simulado, nunca a base
real. Não habilite as flags de produção dentro dos testes. Em produção, faça
backup regular e rebuild da API antes de instalar o app com o recurso.

Para Android, use Node e dependências do lockfile, JDK 17, SDK/plataforma 36 e NDK
27.1.12297006. No app:

```powershell
npm ci
$env:EXPO_NO_DOTENV='1'
$env:EAS_PROJECT_ID='<UUID do seu projeto Expo>'
$env:EXPO_PUBLIC_API_URL='<URL HTTPS da API com os endpoints novos>'
npx expo prebuild --platform android --no-install
cd android
.\gradlew.bat :app:assembleDebug '-PreactNativeArchitectures=arm64-v8a' --max-workers=2
```

O APK debug fica em `app/android/app/build/outputs/apk/debug/app-debug.apk`.
Ele usa Metro e assinatura de debug; **não instale por cima do app de produção**.
Não desinstale produção para resolver conflito de assinatura, pois isso apaga
os dados locais/credenciais do aparelho.

### Cópia de teste separada, preservando produção

Depois de versionar estas alterações, clone o repositório em outra pasta e faça
`npm ci` no `app` dessa cópia. Antes do prebuild, altere **só nessa cópia**:

```powershell
node -e "const fs=require('fs');const p='app.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.expo.name='ViKash Voz Teste';j.expo.android.package='com.vikash.voicetest';fs.writeFileSync(p,JSON.stringify(j,null,2));"
```

Execute o prebuild e assembleDebug acima nessa cópia. O plugin gera os nomes
Kotlin/atalhos para o pacote escolhido. Com depuração USB autorizada:

```powershell
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8081
npx expo start --localhost --port 8081
```

Abra **ViKash Voz Teste** diretamente no celular e faça login. Não tente abrir o
QR no Expo Go. O APK debug depende do Metro ativo. Para uma release autônoma,
use o workflow já existente do `vikash-builds`, com a mesma chave da produção;
o plugin e o módulo serão incluídos pelo prebuild. Não exponha senhas de assinatura.

### Habilitar no HyperOS

1. Instale a build nativa com o módulo e faça login nela.
2. Meu perfil → **Adicionar atalho de voz**.
3. Android 13+ pode apresentar o pedido oficial de adicionar tile.
4. Se o fabricante não mostrar o pedido: abra a Central de Controle → **Editar**,
   encontre **Registrar Gasto** e arraste para a área de atalhos ativos.
5. Pelo launcher, pressione o ícone do app e use **Registrar por voz**. Launchers
   compatíveis permitem arrastá-lo para a tela inicial.
6. Fora do app, toque no tile. Aceite o processamento informado na primeira vez,
   autorize microfone, fale e revise a transcrição. Toque **Analisar**, corrija
   os campos necessários e toque **Confirmar registro**.
7. Confira o lançamento no extrato e o saldo/limite no app. Fale novamente somente
   quando quiser criar outro lançamento.

## Matriz de validação no POCO

ADB não encontrou dispositivo conectado durante a implementação. Não foi feita
instalação/desinstalação nem alteração de dados de um celular. Ainda é necessário
validar no POCO/HyperOS:

- abertura com app encerrado, aberto e em segundo plano;
- retorno à home ou a outro app, sem deixar o dashboard como etapa intermediária;
- bloqueio/desbloqueio e ausência de informações financeiras na tela bloqueada;
- primeira permissão, permissão negada/revogação e microfone ocupado por outro app;
- modelo pt-BR local disponível/ausente e fallback remoto escolhido conscientemente;
- silêncio, sem rede, cancelar/regravar e saída durante captura;
- toque duplo no tile e no botão de confirmação;
- editar valor/categoria/conta/cartão, receita e parcelamento no crédito;
- falha/resposta perdida no salvamento e reabertura com Verificar registro;
- sessão expirada, troca de perfil e atualização do extrato/saldo;
- fontes grandes, teclado, TalkBack e Reduzir movimento.

Os exemplos sem conta ou forma de pagamento ("Gastei 35 reais com almoço",
"Recebi 2500 reais de salário") devem abrir revisão solicitando esses dados,
em vez de escolher uma conta silenciosamente. Datas relativas são resolvidas
pelo extrator já existente, usando o calendário de São Paulo; valores da revisão
usam strings decimais/BigInt e BigDecimal no servidor.

## Limitações e diagnóstico

- O pedido automático de adicionar tile depende do Android/fabricante; a edição
  manual é a alternativa oficial. Sem teste físico, não há garantia específica
  para esta versão do HyperOS ou para o modelo pt-BR instalado no POCO.
- Se o tile não aparecer, confirme que instalou uma nova build, não só OTA/Expo Go.
- Se não houver reconhecimento local, tente o serviço padrão ou digite; verifique
  os apps Google/Reconhecimento e síntese de fala e a disponibilidade do idioma.
- Se a API retornar 404 nos novos endpoints, rebuild a API com esta implementação.
- Uma confirmação pendente fica bloqueada para edição até obter resultado, evitando
  transformar uma operação incerta em outro lançamento. A confirmação pode ser
  repetida após reiniciar a API, pois os recibos são persistentes.
- Ao trocar de Activity ou retornar após autenticação, a verificação de sessão
  precisa de rede. Isso é uma escolha de segurança; o atalho não ignora essa etapa.
- O schema técnico é criado pelo Hibernate atual. Caso produção troque para
  `ddl-auto=validate`, inclua uma migração formal dessa tabela antes do deploy.
- O recebimento de uma OTA futura continua condicionado ao fingerprint nativo
  desta nova build; não force um runtime antigo para incluir o módulo.

## Referências oficiais

- https://developer.android.com/develop/ui/views/quicksettings-tiles
- https://developer.android.com/reference/android/service/quicksettings/TileService
- https://developer.android.com/develop/ui/views/launch/shortcuts/creating-shortcuts
- https://docs.expo.dev/modules/overview/

## Verificação executada

Resultados e limites finais registrados no resumo da entrega. Os testes de IA
usam respostas simuladas do Gemini: não demonstram reconhecimento acústico nem
qualidade linguística real no aparelho. Não foram enviadas movimentações reais
ao Gemini nem gravados lançamentos na base de produção durante os testes.

### Resultados em 21/10/2026

- Build Android ARM64 debug: `BUILD SUCCESSFUL`; TileService/Activity/ícone e
  metadados do launcher conferidos no APK, assinatura verificada.
- App: 804 testes aprovados (100 suítes); inclui consentimento, prévia sem
  gravação, confirmação, duplicidade, perda de resposta, retomada e sessão entre
  duas raízes Android. Lint dos arquivos alterados sem erros. Vite compilou.
- Auditoria estática de UI em modo estrito: zero achados. Não substitui teste
  visual/gestual no dispositivo.
- API: os 8 testes novos de integração passaram; também passaram os testes de
  validação de voz e saldos (18 verificações nesse recorte).
- Na suíte ampla da API foram executados 650 testes, com 33 ignorados e 4 falhas
  em `PasswordResetIntegrationTest` (2 falhas de recebimento de e-mail simulado
  e 2 erros de limpeza por chave estrangeira). As mesmas quatro falhas foram
  reproduzidas isoladamente no backend do commit anterior, sem esta funcionalidade.
  Essa funcionalidade de senha não foi alterada. `mvn verify`/Coolify continuará
  sujeito a essas falhas preexistentes enquanto elas não forem corrigidas.
- Não houve chamadas reais ao Gemini, teste acústico/gestual no POCO, deploy da
  API, instalação em aparelho ou substituição do app de produção.

`DrawerModal` e `SelectionField` receberam uma opção de redução de movimento
explícita usada apenas pelo atalho. Os padrões dos drawers existentes não mudam.
