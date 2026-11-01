# ViKash local — entrega para o responsável pelo FuelLog

Preparado em 01/11/2026. Escopo exclusivamente local. Nenhum arquivo FuelLog, serviço de produção, push ou OTA foi alterado.

## Endereços e cliente

| Item | Valor |
|---|---|
| Base URL / issuer ViKash | `http://127.0.0.1:8082` |
| Autorizar | `http://127.0.0.1:8082/oauth2/authorize` |
| Trocar/renovar tokens | `http://127.0.0.1:8082/oauth2/token` |
| Revogar | `http://127.0.0.1:8082/oauth2/revoke` |
| Catálogo | `http://127.0.0.1:8082/api/integrations/v1/fuellog/catalog` |
| Client ID | `fuellog` |
| Autenticação do cliente | `client_secret_basic` no backend |
| Fluxo | Authorization Code + PKCE S256 |
| Scopes | `fuellog.catalog fuellog.entries` |
| Callback exato registrado | `http://127.0.0.1:8080/api/v1/integrations/vikash/callback` |

Use os endereços exatamente assim, sem substituir `127.0.0.1` por `localhost`, IP da LAN ou nome de container. O issuer não tem barra final. O callback não admite wildcard nem parâmetros arbitrários.

## Segredo: transferência protegida

O segredo original foi gerado com 32 bytes aleatórios e está **somente** no arquivo temporário:

`C:\Users\vikto\Desktop\vikash\backend\.codex\fuellog-local\fuellog-client-secret.env`

Ele contém uma única variável: `FUELLOG_VIKASH_CLIENT_SECRET`. A ACL permite somente o usuário Windows atual e SYSTEM; o caminho é ignorado pelo Git. O ViKash recebe somente o hash `{bcrypt}...`, confirmado byte a byte no container em execução, inclusive os caracteres `$`.

O responsável pelo FuelLog deve consumir esse arquivo sem imprimir seu conteúdo, armazenar o valor apenas na configuração privada do backend e depois apagar o arquivo temporário quando não precisar mais dele. Não colocar o valor em chat, comandos literais, frontend, APK, logs ou Git. Não reutilizá-lo como chave de cifragem dos tokens.

Um `.env` adicional pode ser carregado pelo Compose do FuelLog junto ao `.env` próprio do projeto. Isso deve ser feito pelo responsável do FuelLog, preservando suas outras variáveis; esta tarefa não alterou seu ambiente nem seus arquivos.

## Configuração a aplicar no FuelLog

```dotenv
FUELLOG_VIKASH_BASE_URL=http://127.0.0.1:8082
FUELLOG_VIKASH_CLIENT_ID=fuellog
FUELLOG_VIKASH_CALLBACK_URL=http://127.0.0.1:8080/api/v1/integrations/vikash/callback
```

`FUELLOG_VIKASH_CLIENT_SECRET` vem do arquivo protegido, sem transcrever seu valor. Definir também a chave de cifragem própria e as URLs exatas de retorno web/nativo exigidas pelo FuelLog. Só depois habilitar `FUELLOG_VIKASH_ENABLED=true`. O retorno web em HTTP deve permanecer em loopback; o retorno nativo deve usar o deep link `fuellog://...` que o app implementa. Esta tarefa não inventou nem alterou esses retornos.

O FuelLog ainda estava com `FUELLOG_VIKASH_ENABLED=false` na verificação. Não houve conexão OAuth concluída entre os aplicativos nem lançamento financeiro enviado.

## Como o mesmo loopback funciona nos dois ambientes

No PC, a porta `127.0.0.1:8082` é publicada pelo container ViKash.

No backend FuelLog, o serviço local `vikash-fuellog-loopback-1` compartilha **a mesma pilha de rede** de `fuellog-api-1`. O proxy realmente escuta no loopback desse namespace, na porta 8082. Ele encaminha para `vikash-local-api:8080`, nome resolvido na rede Docker local `fuellog_default`, à qual apenas a API ViKash foi conectada adicionalmente. O PostgreSQL ViKash continua em sua rede própria.

Assim, `127.0.0.1` não está sendo tratado como o computador a partir de um container distinto. Existe um listener no loopback que o FuelLog usa. Não foi flexibilizada a validação de HTTP dos aplicativos, não existe exceção de IP de LAN e não há túnel, domínio externo ou certificado novo.

O proxy só atende o loopback, não publica portas adicionais no host, roda sem privilégios, com filesystem somente leitura e sem access log. Cookies do consentimento usam `HttpOnly`, `SameSite=Lax` e `Secure=false` exclusivamente neste HTTP local. `FORWARD_HEADERS_STRATEGY=none`; não foi estabelecida confiança em cabeçalhos de proxy externos.

Referências: [Docker — compartilhamento da rede de um container](https://docs.docker.com/engine/network/#container-networks), [Compose — substituição de portas com !override](https://docs.docker.com/reference/compose-file/merge/#replace-value).

## Importante após recriar o FuelLog

Ao recriar/reiniciar o container FuelLog para aplicar suas variáveis, recrie **somente o proxy ViKash**, para que ele se associe ao novo namespace de rede. No diretório `C:\Users\vikto\Desktop\vikash\backend`:

```powershell
docker compose -f compose.yaml -f compose.local.yaml -f compose.fuellog.local.yaml up -d --no-deps --force-recreate fuellog-loopback
```

Depois confirme o acesso do backend sem usar credenciais:

```powershell
docker exec fuellog-api-1 wget -qO- http://127.0.0.1:8082/.well-known/oauth-authorization-server
```

O issuer retornado deve ser `http://127.0.0.1:8082`. Não é necessário reiniciar PostgreSQL, nem ViKash API, nem outros projetos. Se o container FuelLog mudar de nome, ajuste a referência `network_mode` no override local ViKash antes de recriar o proxy.

Para uma futura subida/recriação da API ViKash, inclua sempre os três arquivos Compose. O terceiro mantém a porta restrita ao loopback e a conexão de rede do proxy:

```powershell
docker compose -f compose.yaml -f compose.local.yaml -f compose.fuellog.local.yaml up -d --no-deps --wait api
docker compose -f compose.yaml -f compose.local.yaml -f compose.fuellog.local.yaml up -d --no-deps --force-recreate fuellog-loopback
```

## Android posterior: USB

Com depuração USB autorizada, execute no PC:

```powershell
adb reverse tcp:8080 tcp:8080
adb reverse tcp:8082 tcp:8082
```

O navegador Android e o app FuelLog devem usar os mesmos endereços `127.0.0.1`. O app local aponta para sua API em `http://127.0.0.1:8080`; a autorização abre o ViKash em `http://127.0.0.1:8082`. Os reverses devem ser restabelecidos se a conexão ADB cair. Não há suporte a Wi-Fi por esta configuração; isso exigiria uma preparação separada de HTTPS confiável.

## Estado e preservação

- `vikash-api-1`: reconstruída e saudável, Java 21, porta host `127.0.0.1:8082`.
- `vikash-postgres-1`: saudável, volume original `vikash_postgres_data`, porta `127.0.0.1:5433`.
- `vikash-fuellog-loopback-1`: proxy local, sem porta publicada no host.
- `fuellog-api-1`: saudável na porta 8080, não reiniciada por esta tarefa.
- `fuellog-db-1`: saudável, não reiniciada por esta tarefa.

Antes da subida, foram guardados um dump PostgreSQL e a configuração anterior no diretório protegido `backend\.codex\fuellog-local`. O banco não foi apagado nem recriado. Contagens existentes de usuários, contas, transações, compras e faturas foram comparadas após subir a API e permaneceram iguais.

## Verificações e pendências

- Rebuild Docker da API concluído, incluindo a verificação Maven prevista no Dockerfile, usando Java 21.
- Hash Spring validado sem expor seu valor; hash exato confirmado no ambiente real da API e segredo original ausente desse ambiente.
- Schema `oauth2_authorization` e `fuellog_refuelings` disponível; cinco índices OAuth, incluindo a chave primária.
- Metadados OAuth com issuer correto, Authorization Code/refresh e PKCE somente S256.
- Os mesmos metadados foram obtidos a partir do namespace real do FuelLog.
- Callback não cadastrado rejeitado com 400, sem redirect.
- Catálogo/refueling/rota comum sem autenticação retornam 401; bearer inválido retorna `invalid_token`.
- Separação JWT/delegação, scopes, rotação, revogação, idempotência e regras financeiras já possuem evidência automatizada da implementação anterior. Não foram reexecutadas operações financeiras contra os dados locais para simular teste conjunto.
- Login local concluído pelo usuário, com acesso autenticado a `/connect/done` confirmado por HTTP 200. O usuário confirmou visualmente a conta e as permissões na prévia do consentimento, no navegador autenticado. A prévia usou marcador fixo sem grant ou PKCE reais; não houve aprovação de vínculo nem teste conjunto entre os aplicativos.

Pendência principal: responsável do FuelLog consumir o segredo, definir seus retornos/chave de cifragem, habilitar a integração e recriar seu backend. Depois recriar o proxy como indicado e iniciar “Conectar ao ViKash” **pelo FuelLog**, para que seu próprio state e verifier sejam válidos. Só então testar o fluxo conjunto e abastecimento controlado com confirmação do usuário.


## Atualização: retorno web após vincular

O responsável pelo FuelLog habilitou a integração e o primeiro vínculo foi persistido como `CONNECTED`. Foi corrigida a CSP ViKash para permitir também os destinos finais já configurados pelo FuelLog:

```dotenv
FUELLOG_WEB_RETURN_URI=http://127.0.0.1:8081/vikash-return
FUELLOG_NATIVE_RETURN_URI=fuellog://vikash-return
```

Essas duas variáveis pertencem ao ViKash e já foram acrescentadas ao `.env` local, preservando o client secret e seu hash. O callback OAuth permanece na porta 8080. A política não foi aberta a origens arbitrárias.

O popup antigo em `/oauth2/authorize` não deve ser reenviado: sua autorização já foi usada. Feche-o e atualize a tela de integração do FuelLog para consultar o vínculo existente. Uma nova tentativa de autorização deve sempre começar pelo FuelLog.
