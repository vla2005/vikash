# Configurar a integração FuelLog no ViKash

Implementação do lado ViKash. Nenhuma publicação nem alteração de produção faz parte desta entrega. O fluxo começa no FuelLog; não há novo menu no aplicativo ViKash.

O contrato compartilhável está em [FUELLOG-HTTP-v1.md](FUELLOG-HTTP-v1.md). O código atual, e não as documentações antigas do aplicativo, foi usado para preservar as regras financeiras.

## Preparar o ViKash

1. Escolha a origem pública HTTPS da API e o callback HTTPS exato do **backend** FuelLog. Não use callback livre, wildcard ou URL informada pelo usuário.
2. Gere um client secret aleatório de pelo menos 32 bytes. Guarde o original somente no servidor FuelLog. Calcule seu hash com `PasswordEncoderFactories.createDelegatingPasswordEncoder().encode(secret)` do Spring Security. O resultado padrão começa com `{bcrypt}`. Não use `{noop}` em ambiente real.
3. Configure as variáveis abaixo, mantendo `FUELLOG_ENABLED=false` até concluir o cadastro e validar em homologação:

   | Variável | Conteúdo |
   |---|---|
   | `FUELLOG_ENABLED` | `true` somente para habilitar o fluxo |
   | `FUELLOG_ISSUER` | Origem HTTPS pública da API ViKash, sem barra final |
   | `FUELLOG_CLIENT_ID` | `fuellog` |
   | `FUELLOG_CLIENT_SECRET_HASH` | Hash Spring `{bcrypt}...`; nunca o secret original |
   | `FUELLOG_REDIRECT_URI` | Callback HTTPS exato do backend FuelLog |
   | `FUELLOG_WEB_RETURN_URI` | URL exata para onde o FuelLog retorna após o callback; HTTPS ou HTTP somente em loopback |
   | `FUELLOG_NATIVE_RETURN_URI` | Deep link exato `fuellog://...` usado pelo aplicativo após o callback |
   | `OAUTH_COOKIE_SECURE` | `true` no Compose com HTTPS |
   | `FORWARD_HEADERS_STRATEGY` | `framework` somente atrás de proxy confiável que sobrescreve os cabeçalhos encaminhados; caso contrário `none` |

   No `.env` do Compose, coloque o hash entre aspas simples para preservar seus caracteres `$`. Não faça commit desse arquivo. Use configuração de **execução**, não argumentos de build. O `.env.example` contém apenas placeholders e mantém a integração desligada.

4. Na execução Java fora do Compose, as variáveis `FUELLOG_*` são as mesmas. Configure também `SERVER_SERVLET_SESSION_COOKIE_SECURE=true` e, quando houver proxy confiável, `SERVER_FORWARD_HEADERS_STRATEGY=framework`. Os nomes `OAUTH_COOKIE_SECURE` e `FORWARD_HEADERS_STRATEGY` são atalhos do Compose.

   Aspas simples protegem o `.env` interpretado pelo Compose. Um arquivo importado pelo Java como `.properties` não remove essas aspas: nesse caso use o valor sem aspas literais ou injete uma variável de ambiente pelo shell.
5. Ao iniciar com a integração habilitada, o script idempotente cria `oauth2_authorization`, usado pelo armazenamento JDBC oficial do Spring Security. `fuellog_refuelings` é criada pelo Hibernate, conforme o `ddl-auto=update` já usado no projeto. Se o ambiente adotar `validate` ou retirar DDL do usuário da API, provisione essas tabelas antes por migração revisada. Não execute o schema OAuth de outro banco sem a adaptação PostgreSQL presente no repositório.
6. Garanta HTTPS no domínio e roteamento de `/oauth2/**`, `/connect/**`, `/.well-known/oauth-authorization-server` e `/api/integrations/v1/fuellog/**` para a API. Cookies de sessão do consentimento são HttpOnly/SameSite=Lax; o app continua usando seus JWTs existentes.

Somente HTTP em `localhost`, `127.0.0.1` ou `::1` é permitido para desenvolvimento. No Compose local com callback loopback, configure `OAUTH_COOKIE_SECURE=false`. Não use essa configuração em domínio público. Uma API pública também exige proxy/firewall que impeça acesso direto contornando o proxy confiável.

## Implementar no FuelLog

1. **Conectar:** backend FuelLog cria `state` aleatório de uso único (20–200 caracteres), PKCE verifier aleatório (43–128 caracteres), challenge S256 e uma tentativa com validade curta. Vincule a tentativa à sessão autenticada e ao usuário FuelLog. Não aceite um `state` arbitrário enviado pelo aplicativo.
2. Abra a URL `/oauth2/authorize` do contrato em navegador seguro. Login e consentimento acontecem no domínio ViKash. A página mostra o nome da conta que receberá os lançamentos e permite trocar de conta antes de autorizar.
3. **Callback:** valide `state`, validade e associação à sessão FuelLog antes de trocar `code`. Use `client_secret_basic`, callback cadastrado e verifier originais em `/oauth2/token`, somente pelo backend. Depois de sucesso, descarte os dados da tentativa.
4. Guarde access/refresh token criptografados no servidor, associados ao usuário FuelLog. Não entregue client secret ou refresh token ao app, URLs, analytics ou logs. Peça somente `fuellog.catalog fuellog.entries`.
5. **Padrões:** consulte `/catalog` e deixe o usuário escolher categoria, pagamento, conta ou cartão e parcelas. Use os IDs retornados; não deduza IDs pelo nome. Permita substituições em cada abastecimento.
6. **Enviar:** mantenha uma fila persistente. Use o mesmo `externalId` imutável e a mesma versão/payload em toda nova tentativa. O total efetivamente pago é `amount`; litros não servem para recalculá-lo. Envie o timestamp com seu offset e o fuso IANA correspondente. Não envie GPS, userId ou e-mail para selecionar a conta financeira.
7. Criação usa `If-None-Match: *`. Guarde resultado e `ETag`. Alteração/cancelamento usa versão maior e `If-Match` atual. Uma repetição idêntica pode reutilizar a precondição original; não precisa mudar a versão.
8. **Timeout:** consulte `GET /refuelings/{externalId}`. Se existir, reconcilie versão e estado. Se retornar 404, repita o PUT original, sem inventar outro ID. Para rede/503, use espera progressiva com variação. Não faça retry cego de 409/412/422/428.
9. **Conflito manual:** apresente o conflito ao usuário. Um GET fornece o novo `ETag`; reutilizá-lo significa autorizar explicitamente a sincronização sobre o estado atual. Não sobrescreva edições do ViKash automaticamente.
10. **Renovar:** serialize o refresh por vínculo. Cada renovação substitui o refresh token; persista o novo par atomicamente no FuelLog. Se o processo perder a resposta após a rotação, o token anterior pode não funcionar: peça reconexão em vez de repetir indefinidamente.
11. **Desconectar:** chame `/oauth2/revoke` no backend e apague as credenciais no FuelLog. Revogação de access ou refresh encerra o vínculo inteiro; lançamentos financeiros permanecem. Não volte a enviar o histórico quando o usuário conectar novamente.

A fila deve guardar também a conexão local a que pertence cada item. Ao desconectar, interrompa os itens daquele vínculo; não os redirecione automaticamente para uma nova autorização. A idempotência vale por vínculo, e uma conexão nova não tem acesso aos lançamentos da anterior.

Não altere o cliente registrado ou suas URLs sem coordenar os dois projetos. Trocar secret/callback em configuração exige reiniciar a API. O usuário e o vínculo são determinados pelo token delegado, nunca por campos do payload.

## Persistência, segurança e operação

- `oauth2_authorization`: códigos, tokens e atributos no formato oficial JDBC. Tokens são dados sensíveis: restrinja o banco, backups e ferramentas de suporte. Criptografia em repouso depende da infraestrutura. Não exponha essa tabela ao leitor SQL da IA.
- `fuellog_refuelings`: usuário/vínculo/externalId, versão, estado, payload canônico, instante/fuso e referência financeira. Registro de rastreamento e efeitos financeiros usam a mesma transação.
- Bloqueio por vínculo serializa criação concorrente, refresh e revogação. Isso prioriza consistência; a fila FuelLog deve limitar concorrência por vínculo.
- Tombstones de cancelamento não devem ser removidos enquanto existir possibilidade de reenvio antigo. Não apague rastreamento para resolver conflitos.
- A versão inicial não agenda limpeza de autorizações expiradas. Defina retenção antes de uso em escala; não apague grants referenciados pelo rastreamento sem preservar o isolamento do vínculo.
- Categorias atuais não têm flag de arquivo nem divisão por receita/despesa; o catálogo retorna as disponíveis no modelo. Contas e cartões são filtrados por atividade e revalidados ao gravar.
- Crédito, inclusive 1x, usa compra/fatura. Parcelas preservam centavos pelo núcleo atual. Edições permitidas em fatura paga continuam possíveis quando o núcleo permite; operações financeiras vedadas retornam conflito, sem desfazer pagamento.
- A integração não chama Gemini. Combustível/litros ficam no rastreamento; a despesa usa descrição e total estruturados.

## Verificação reproduzível

Testes locais com dados fictícios, sem acesso ao FuelLog, Gemini, e-mail real ou produção:

```powershell
mvn '-Dtest=FuelLogOAuthIntegrationTest,FuelLogDisabledIntegrationTest,FuelLogFinancialServiceTest,SafeMessageConverterTest' test
mvn test
```

As variantes `FuelLogOAuthPostgresIntegrationTest` e `FuelLogFinancialPostgresTest` repetem os cenários no PostgreSQL. São opt-in: `VIKASH_FUELLOG_POSTGRES_TEST=true` e `FUELLOG_TEST_DB_URL=jdbc:postgresql://127.0.0.1:PORTA/fuellog_integration_test`. Só aceitam banco com esse nome em loopback, usam usuário `fuellog_test`, senha fictícia `isolated-test-only` e **create-drop**. Prepare um PostgreSQL descartável, sem dados reais; nunca aponte esses testes para um banco existente. Rode as duas classes em sequência, sem Maven paralelo.

Validação final, contagem e eventuais limitações constam em `FUELLOG-VERIFICATION.md`. Ainda cabe aos dois projetos testar o callback real e o fluxo completo em homologação antes de habilitar produção.


## CSP e retorno depois do callback

O callback OAuth continua sendo apenas `FUELLOG_REDIRECT_URI`. Quando o backend FuelLog redireciona depois para sua interface web ou para o aplicativo nativo, configure também `FUELLOG_WEB_RETURN_URI` e `FUELLOG_NATIVE_RETURN_URI` com os mesmos destinos exatos usados pelo FuelLog. Esses valores são configurações do operador; não são aceitos via query ou payload da autorização.

A página de consentimento mantém `form-action` restrito à própria origem, à origem do callback e aos retornos explicitamente cadastrados. O login permanece somente em `'self'`. Web não aceita HTTP de LAN nem wildcard; retorno nativo aceita apenas o esquema `fuellog`, sem userinfo, porta, query ou fragmento. Isso evita que o Chromium bloqueie a cadeia callback do backend / retorno da interface sem liberar destinos arbitrários.

Se mudar os retornos FuelLog, atualize essas duas variáveis e reinicie somente a API ViKash. Não é necessário trocar credenciais ou desfazer vínculos existentes.
