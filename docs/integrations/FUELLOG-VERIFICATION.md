# FuelLog — Implementação e verificação

Data: 01/11/2026. Escopo: somente código ViKash. Nenhum deploy, push, mudança de produção ou alteração de arquivos FuelLog.

## Implementação

- Authorization Code + PKCE S256 em Spring Security Authorization Server 7.1.1, dependência gerenciada pelo Spring Boot 4.1.1 existente. Não houve atualização da stack.
- Cliente confidencial de backend, callback previamente cadastrado, state, código de uso único, consentimento explícito com identidade da conta, CSRF e troca de conta preservando a tentativa.
- Access token opaco de cinco minutos, refresh de trinta dias com rotação, revogação do vínculo, persistência JDBC e scopes exclusivos. JWT comum não autoriza a integração; token delegado não abre a API comum.
- Catálogo mínimo, criação, consulta, atualização e cancelamento em `/api/integrations/v1/fuellog`. Referências são revalidadas por usuário e atividade.
- Rastreamento e efeito financeiro na mesma transação. Bloqueio por autorização, versões monotônicas, repetição idêntica sem duplicação, ETag para detectar mudanças manuais e tombstones de cancelamento/exclusão.
- Reuso dos serviços financeiros para despesas e compras no crédito, inclusive 1x e parcelas. Edições não financeiras permitidas pelo núcleo continuam funcionando em compra com fatura paga. Operações financeiras vedadas preservam pagamentos.
- Sem Gemini, GPS, importação automática ou menu novo no app. O campo obrigatório de transcrição do núcleo recebe uma identificação fixa da origem; o payload não é transformado em frase para interpretação.
- Configuração desligada por padrão, schema OAuth idempotente com índices, proteção adicional dos logs e exclusão das variáveis de produção dos testes Maven. `.gitignore` libera somente os novos documentos FuelLog dentro das docs locais ignoradas.

## Testes executados

### Suíte backend completa

Comando: `mvn -q test`.

Resultado final: 724 cenários descobertos, **661 executados com sucesso**, zero falhas e zero erros. Os 63 ignorados exigem opt-in de testes externos. Desses, 30 são as variantes FuelLog/PostgreSQL executadas separadamente abaixo; os outros 33 são testes opt-in existentes de IA/PostgreSQL.

Inclui 14 testes HTTP FuelLog em servidor real local, 16 testes financeiros e um teste da integração desligada, além da regressão da API existente e da proteção de logs/configuração.

### PostgreSQL real, isolado

Comando: `mvn -q -Dtest=FuelLogOAuthPostgresIntegrationTest,FuelLogFinancialPostgresTest test`, com opt-in e URL explícita do banco descartável.

**30 testes passaram**, zero falhas, erros ou ignorados: 14 HTTP/OAuth e 16 financeiros. Banco PostgreSQL **18.3**, em containers novos, sem volumes persistentes, expostos somente em loopback. Não foi usado o banco de desenvolvimento nem produção. Containers temporários removidos ao terminar.

### Cenários principais

| Área | Verificação |
|---|---|
| Autorização | PKCE obrigatório, callback adulterado rejeitado, CSRF em login/consentimento, negação preserva state, state forjado rejeitado, troca de conta exige novo login |
| Credenciais | Código/verifier e uso único, scopes, separação JWT/delegação, expiração, rotação concorrente de refresh, revogação repetível e bloqueio do access |
| Navegador | HTML do consentimento escapa campos, não usa scripts, impede framing e permite somente a própria origem e as origens do callback e dos retornos explicitamente cadastrados em form-action |
| Isolamento | Usuário e vínculo diferentes não consultam/cancelam lançamento alheio; lançamento manual não integrado não é alvo de mutação; conta alheia rejeitada; catálogo não expõe saldos/limites |
| Concorrência | Dois PUTs HTTP simultâneos resultam em uma criação e um replay; conta debitada uma única vez; GET reconcilia resultado após perda de resposta |
| Versões | Repetição normaliza decimais, mesma versão divergente conflita, versão antiga rejeitada, precondição obrigatória |
| Edições | Mudança manual altera ETag; conversão manual de modalidade e exclusão manual detectadas; edição exige precondição atual |
| Financeiro | Débito correto, crédito sem saída paralela em conta, 1x e parcelas, total exato/centavos, rollback de substituição inválida |
| Faturas pagas | Mudança de valor/data/parcelas e exclusão vedadas quando o núcleo restringe; edição permitida de descrição/categoria mantém linhas financeiras |
| Cancelamento | Reverte saldo uma vez, preserva tombstone, repetição não debita novamente e reenvio não reativa |
| Referências | Categoria inexistente/alheia, conta/cartão inválidos ou inativos e valores inválidos não gravam efeitos |
| Regressão | API comum continua autenticando com JWT; feature desligada não abre rotas delegadas; variáveis de produção não entram nos testes |

O ciclo RED/GREEN identificou e corrigiu normalização indevida do offset JSON, necessidade de CSRF explícito nos endpoints de consentimento do Authorization Server, encoder do client secret, revogação repetida e preservação da tentativa ao trocar de conta. As regras financeiras foram exercitadas antes e depois da implementação.

## Limites e pendências reais

1. Testes Java executados com JDK 26, compilação configurada para Java 21. A imagem final de produção e seu JDK não foram reconstruídos nesta tarefa.
2. O login/consentimento foi exercitado por HTTP automatizado. Ainda falta homologação com o callback e a interface reais do FuelLog, incluindo navegador do Android/iPhone. Não houve envio de credenciais para outro projeto.
3. Revisão estática adicional conferiu cadeias de segurança e bloqueios. Concorrência de PUT e refresh foi testada; corrida de revogação contra uma gravação já em andamento não foi reproduzida por um teste dedicado. Ambos usam o bloqueio da mesma autorização e revalidação dentro da transação.
4. Nenhuma chamada real ao Gemini: a integração é estruturada e não depende dele. Testes externos existentes continuam opt-in.
5. O modelo atual não possui categoria arquivada nem categoria exclusiva de despesa. Não foi criado um conceito novo para simular isso. Contas/cartões possuem atividade e foram filtrados/revalidados.
6. Limpeza de autorizações expiradas não é agendada nesta versão. Definir retenção e criptografia de banco/backups antes de uso em escala. Nunca remover tombstones para resolver conflitos.
7. Configurar issuer, callback, hash do secret, TLS/cookies e proxy confiável conforme [FUELLOG-CONFIGURATION.md](FUELLOG-CONFIGURATION.md), depois testar em homologação. Integração permanece desligada por padrão.

Referência da política de navegador: [MDN — CSP form-action](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/form-action). Alguns navegadores também aplicam a política ao redirecionamento após o formulário; por isso as origens cadastradas do callback e dos retornos finais do FuelLog são permitidas explicitamente.


## Correção do retorno do navegador — 01/11/2026

No primeiro teste conjunto, o backend completou a troca de código por tokens e o FuelLog persistiu `CONNECTED`. O Chromium bloqueava a navegação seguinte do callback na porta 8080 para a interface web na porta 8081. A janela permanecia no consentimento; repetir o envio recebia 400 porque a autorização já havia sido consumida.

A CSP foi mantida. Os destinos finais passaram a ser configurações explícitas do cliente (`FUELLOG_WEB_RETURN_URI` e `FUELLOG_NATIVE_RETURN_URI`), validadas no startup. O login continua restrito à própria origem; CSRF, PKCE, callback exato e uso único não foram alterados.

Regressão: 20 testes direcionados passaram (14 OAuth HTTP, 1 feature desligada, 3 validações de retorno e 2 de isolamento do ambiente). O comportamento do Chromium foi reproduzido em fixture HTTP local sem credenciais: a política anterior bloqueia a cadeia e a lista explícita com o retorno web a conclui. A abertura do aplicativo nativo em dispositivo continua pendente.
