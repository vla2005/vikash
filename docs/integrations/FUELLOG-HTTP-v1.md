# FuelLog / ViKash — Contrato HTTP v1
Status: contrato definido em 01/11/2026; implementado localmente; configuração e verificação em FUELLOG-CONFIGURATION.md e FUELLOG-VERIFICATION.md. Estas rotas são novas, não existiam no catálogo legado.
Base: origem HTTPS da API ViKash; exemplos usam https://api-vikash.viktorware.com. Não habilitar produção nesta tarefa.

## Autorização delegada
FuelLog é cliente confidencial de backend, com secret somente no servidor. Authorization Code com PKCE S256 obrigatório, via Spring Security Authorization Server mantido pela versão do Spring Boot. Callback HTTPS exato previamente cadastrado; sem curingas, fragmentos ou redirect livre. Desenvolvimento admite HTTP somente em loopback.
1. FuelLog gera state imprevisível (20–200 caracteres), vinculado à sua sessão e tentativa, e verifier aleatório (43–128 caracteres). Guarda ambos no backend.
2. Navegador abre GET /oauth2/authorize?response_type=code&client_id=fuellog&redirect_uri=CALLBACK_CADASTRADO&scope=fuellog.catalog%20fuellog.entries&state=STATE&code_challenge=BASE64URL_SHA256_VERIFIER&code_challenge_method=S256.
3. Página do ViKash autentica em sessão web própria e mostra identidade da conta e permissões. Consentimento explícito obrigatório para cada novo vínculo. Login/consentimento usam CSRF e cookies HttpOnly/SameSite; nada de senha no FuelLog.
4. Callback recebe code e state (ou error=access_denied e state). FuelLog confere state de uso único e troca code no backend.
5. POST /oauth2/token, application/x-www-form-urlencoded, client_secret_basic, grant_type=authorization_code, code, redirect_uri exato e code_verifier. Código de uso único/5 min.
6. Resposta padrão OAuth: access_token opaco (5 min), refresh_token (30 dias), token_type=Bearer, expires_in=300, scope. Não usar token comum do app.
7. Renovar: POST /oauth2/token com client_secret_basic, grant_type=refresh_token e refresh_token. Rotação obrigatória. Serializar renovações; nunca reenviar refresh antigo.
8. POST /oauth2/revoke com client_secret_basic, token atual e token_type_hint. Revogar access ou refresh invalida o vínculo inteiro, inclusive acessos já emitidos. Repetição retorna 200, sem revelar tokens.
O vínculo é uma autorização OAuth; novas autorizações são vínculos novos. FuelLog NÃO reenvia histórico automaticamente após vincular/revincular. Tokens são restritos às rotas desta integração; JWT comum não funciona nelas e credencial FuelLog não funciona na API comum.
Não existe grant client_credentials nem password grant. Revogação do vínculo preserva lançamentos.

### Exemplo da troca de código
Os valores em maiúsculas são placeholders. A autenticação Basic contém o client ID e o secret original, codificados conforme OAuth; o secret nunca fica no app móvel.

```http
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic CLIENT_CREDENTIALS_EM_BASE64

grant_type=authorization_code&code=CODIGO_RECEBIDO&redirect_uri=CALLBACK_URL_ENCODED&code_verifier=VERIFIER_ORIGINAL
```

```json
{
  "access_token": "ACCESS_TOKEN_OPACO",
  "refresh_token": "REFRESH_TOKEN_OPACO",
  "token_type": "Bearer",
  "expires_in": 300,
  "scope": "fuellog.catalog fuellog.entries"
}
```

Callback de sucesso: `CALLBACK_CADASTRADO?code=CODIGO&state=STATE_ORIGINAL`. Quando o callback já tiver query, o servidor acrescenta os parâmetros. Em cancelamento, recebe `error=access_denied` e o mesmo `state`.

## Rotas financeiras
Todas exigem Authorization: Bearer ACCESS_TOKEN_DELEGADO. Sem userId/email no payload.
- GET /api/integrations/v1/fuellog/catalog (scope fuellog.catalog).
- PUT /api/integrations/v1/fuellog/refuelings/{externalId} (scope fuellog.entries).
- GET /api/integrations/v1/fuellog/refuelings/{externalId} (scope fuellog.entries).
- DELETE /api/integrations/v1/fuellog/refuelings/{externalId}?version=2 (scope fuellog.entries).
externalId: identificador imutável FuelLog, 1–100 caracteres [A-Za-z0-9._-]. Não usar placa, e-mail ou dados pessoais.

### Catálogo
Resposta 200 (nomes e IDs ilustrativos):
```json
{ "apiVersion":"1", "categories":[{"id":"default:1","name":"Combustível","kind":"DEFAULT"},{"id":"custom:UUID","name":"Carro","kind":"CUSTOM"}], "accounts":[{"uuid":"UUID","description":"Carteira","type":"CARTEIRA"}], "cards":[{"uuid":"UUID","description":"Banco •••• 1234"}], "paymentMethods":["PIX","DEBIT_CARD","CASH","CREDIT_CARD","BANK_TRANSFER","BANK_SLIP","OTHER"], "installments":{"min":1,"max":120,"creditOnly":true}, "currency":"BRL" }
```
IDs padrão usam ID persistido prefixado default:, personalizados UUID prefixado custom:. Tratar todos como opacos e reutilizar o catálogo do ambiente. Categoria obrigatória, somente categorias disponíveis a despesas (o modelo atual não separa categorias por tipo/arquivamento). Somente contas/cartões ativos. Sem saldos, limites, histórico, agência, número de conta ou dados bancários completos. Revalidar tudo na gravação.

### PUT: payload completo
Content-Type: application/json.
Criação exige If-None-Match: *. Alteração exige If-Match: "ETAG_OBTIDO_NO_GET".
```json
{
 "version":1,
 "occurredAt":"2026-11-01T14:30:00-03:00",
 "timeZone":"America/Sao_Paulo",
 "amount":251.60,
 "currency":"BRL",
 "description":"Abastecimento — Posto Central",
 "fuel":"GASOLINE",
 "liters":40.000,
 "categoryId":"default:1",
 "paymentMethod":"PIX",
 "accountUuid":"UUID_DA_CONTA",
 "creditCardUuid":null,
 "installmentCount":1
}
```
version: inteiro positivo monotônico por abastecimento/vínculo. amount: total efetivamente pago, positivo, até 13 inteiros/2 decimais. Não recalcular por litros; nenhum Gemini.
occurredAt: timestamp com offset. timeZone: ZoneId IANA; offset deve corresponder ao fuso no instante. Núcleo atual recebe a data/hora local desse fuso; metadados preservam instante/fuso originais.
description 1–255 caracteres; fuel 1–40; liters positivo até 9 inteiros/3 decimais; moeda somente BRL.
PIX/DEBIT_CARD/CASH/BANK_TRANSFER/BANK_SLIP/OTHER: accountUuid obrigatório, creditCardUuid ausente, installmentCount=1.
CREDIT_CARD, inclusive 1x: creditCardUuid obrigatório, accountUuid ausente, 1–120 parcelas, mínimo de R$0,01 por parcela. Não cria saída paralela em conta.
Cartões/faturas/centavos usam núcleo existente. Não desmarcar fatura paga.

### Resultado
201 na criação; 200 em atualização e repetição idêntica; cabeçalho ETag em GET/PUT/DELETE e Location na criação.
```json
{
 "externalId":"refuel-123", "version":1, "status":"ACTIVE",
 "financialUuid":"UUID", "financialKind":"TRANSACTION",
 "manuallyModified":false
}
```
financialKind: TRANSACTION ou CREDIT_CARD_PURCHASE. status: ACTIVE, CANCELLED ou MANUALLY_DELETED.
GET depois de timeout devolve resultado persistido, sem novos efeitos. 404 significa ausente nesse vínculo; reenvie o mesmo PUT de criação. Nunca inventar novo externalId após timeout.
Repetição da última versão com conteúdo normalizado idêntico devolve o mesmo resultado sem novo débito; mesma versão/conteúdo diferente é 409 VERSION_CONFLICT. Versão inferior é 409 STALE_VERSION. Versão maior exige precondição atual; não há importação implícita.
ETag representa versão externa e estado financeiro atual. Edição manual muda ETag; um envio com ETag antigo retorna 412 PRECONDITION_FAILED. FuelLog deve mostrar o conflito, consultar e só reenviar com ETag novo após escolha explícita do usuário. Não fazer retry cego de conflitos.
Exclusão manual no ViKash nunca recria silenciosamente: GET indica MANUALLY_DELETED, PUT retorna 409 MANUALLY_DELETED.
DELETE exige version maior e If-Match. Repetição do mesmo cancelamento é 200. Cancela financeiramente na mesma transação e conserva tombstone; nenhum PUT posterior pode reativar esse externalId (409 CANCELLED), nem um envio antigo. Cancelamento de compra com parcela paga é 409 FINANCIAL_RESTRICTION.
Mudanças que exigem recriar parcelas respeitam restrições de faturas pagas; pagamentos de fatura nunca são desfeitos pela integração.

## Erros
Padrão legado ErrorResponse: timestamp, status, error, message, path, code e fieldErrors quando aplicável.
400 INVALID_REQUEST: JSON/campos/formato inválidos.
401: token expirado, revogado ou ausente; autenticação Bearer usa WWW-Authenticate com invalid_token quando aplicável. Não determina usuário por dados enviados.
403: permissão ausente; autenticação Bearer informa insufficient_scope em WWW-Authenticate.
404 NOT_FOUND: referência externa ausente/alheia indistinguíveis.
409 VERSION_CONFLICT / STALE_VERSION / CANCELLED / MANUALLY_DELETED / FINANCIAL_RESTRICTION.
412 PRECONDITION_FAILED: mudança manual ou concorrente.
428 PRECONDITION_REQUIRED: precondição If-Match/If-None-Match ausente.
422 INVALID_REFERENCE: categoria/conta/cartão inexistente, alheio ou inativo.
503: indisponibilidade; consultar resultado e repetir com mesmo ID/versão.
OAuth usa erros padrão OAuth, sem incluir credenciais nas mensagens/logs.
FuelLog deve persistir fila e distinguir 4xx permanentes de falhas de rede/5xx. Não registrar Authorization, code, verifier, secret, refresh/access tokens.

## Consistência / operação
Vínculo, externalId, versão/payload e UUID financeiro persistem atomicamente com efeitos financeiros. Bloqueio de vínculo e registro serializa concorrência e revogação; transação com erro reverte tudo.
Não armazenar GPS. Fonte da edição/cancelamento é sempre verificada; a integração não recebe UUID financeiro arbitrário para alterar.
Configuração local desabilitada por padrão. Secrets/callbacks/issuer são configurados pelo operador; exemplos são placeholders.
Contrato v1 é compatível apenas com os formatos acima. Qualquer alteração incompatível exige avisar antes e publicar versão nova.


Configuração do operador e sequência para o FuelLog: [FUELLOG-CONFIGURATION.md](FUELLOG-CONFIGURATION.md). Evidências: [FUELLOG-VERIFICATION.md](FUELLOG-VERIFICATION.md).

Retorno de interface após o callback: o operador cadastra `FUELLOG_WEB_RETURN_URI` e `FUELLOG_NATIVE_RETURN_URI` para a CSP do consentimento. Isso não adiciona callbacks OAuth nem altera o contrato HTTP; a URI OAuth continua exata e única.
