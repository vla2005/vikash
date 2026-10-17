# Pergunte ao ViKash — fluxo financeiro

## Estado atual

Implementado: **pergunta → Gemini com catálogo → SQL validado → consulta isolada por usuário → resultado → resposta no chat**.
O chat recebe `answered` e a resposta financeira quando a redação está habilitada.
O Gemini redige um template com referências; a API valida e substitui essas referências
por valores formatados das células consultadas. Cálculos permanecem no PostgreSQL.

Planejamento, execução, redação e memória têm flags separadas, todas `false` por padrão. O ambiente
local está habilitado para testes; senhas ficam apenas no `.env` ignorado pelo Git.
Anexos ainda são recusados antes do envio à API.

## Fluxo completo da requisição

1. O app envia `POST /api/assistant/messages`, JWT e `Idempotency-Key`, com apenas
   `conversationId` opcional, `clientConversationId`, `clientMessageId` e `content`.
   Usuário, histórico e papéis informados pelo cliente não são utilizados.
2. `AssistantQuestionService` identifica o usuário autenticado, confere propriedade,
   limites e idempotência e persiste a pergunta em uma transação curta.
3. `AssistantPlanningStore` reserva o processamento por até 90 segundos, com token
   de controle. Recupera até 12 mensagens oficiais anteriores da mesma conversa,
   limitadas a 24.000 bytes. Perguntas incompletas/falhas não entram no contexto.
   Quando habilitada, a memória acrescenta resumo de intenção e filtros persistidos
   da própria conversa; a pergunta atual continua tendo prioridade.
4. `AssistantGeminiClient` envia pergunta, histórico, catálogo versionado e calendário
   calculado pelo servidor. JSON Schema, temperatura 0, até 100.000 bytes de entrada
   e 4.096 tokens de saída por padrão. O histórico pode conter valores das respostas
   oficiais anteriores; não recebe o snapshot bruto da nova consulta, anexos ou
   credenciais no conteúdo. Aplica limites de uso/concorrência de `AiUsageService`.
5. Gemini devolve `query`, `clarify` ou `unsupported`. A API valida formato, versão,
   parâmetros e views. Em query, `AssistantSqlValidator` analisa a AST e reconstrói
   SQL canônico com bindings separados; nunca executa o texto original do modelo.
6. `AssistantQueryExecutor` revalida o plano e exige a comprovação correspondente.
   Obtém o UUID de `AuthenticatedUserService`, nunca do plano, parâmetro ou payload.
7. Empresta uma conexão de um pool Hikari exclusivo. Confere login, privilégios e
   acesso apenas às sete views. Configuração incompatível bloqueia a consulta;
   não existe fallback para a conexão principal da API.
8. Inicia transação `REPEATABLE READ`, `READ ONLY`; define UUID, search_path
   `pg_catalog`, timezone, row_security e limites com `SET LOCAL`/`set_config(...,true)`.
   As views filtram dados no banco pelo UUID autenticado de um usuário ativo.
9. Executa `EXPLAIN (ANALYZE FALSE, FORMAT JSON)` com os mesmos bindings. Examina
   custo, cardinalidade e quantidade de nós antes do SELECT. O EXPLAIN não executa
   a consulta. A estimativa considera os parâmetros efetivos, com plano customizado.
10. Se o plano cabe no orçamento, executa apenas o SELECT canônico parametrizado.
    Timeouts do PostgreSQL e limites de saída continuam ativos durante a leitura.
    Falha/estouro descarta o resultado inteiro; não apresenta um agregado parcial.
11. Em toda saída executa rollback antes de devolver a conexão ao pool. Isso encerra
    também o contexto `LOCAL`. Se rollback falhar, a conexão é descartada.
12. Outra transação curta salva proposta, validação e snapshot limitado, vinculados
    ao dono e ao plano/parâmetros. Reserva a geração com status `answering` e token.
13. `AssistantAnswerClient` faz uma segunda chamada ao Gemini, fora de transação:
    pergunta, histórico oficial, interpretação e fatos selecionados do resultado.
    UUIDs técnicos, SQL, hashes, custos, credenciais e outros usuários ficam fora
    desse payload. Nomes/descrições continuam sendo dados não confiáveis.
14. O modelo devolve JSON com um template, por exemplo `Seu saldo é {{r0c0:money}}.`.
    `AssistantAnswerFormatter` aceita apenas referências existentes e formatos
    permitidos. A API insere o valor e formata moeda/número/data em pt-BR. Dígitos
    inventados fora das referências, referências inválidas, código/HTML/links e
    saída excessiva são rejeitados. BigDecimal preserva centavos, inclusive em
    totais grandes. Não se delegam somas/divisões ao redator.
15. Uma transação curta confere novamente dono, snapshot, lease e comprovação da
    resposta. Salva conteúdo oficial, versões/hashes e data, então retorna `answered`.
    O chat existente recebe texto pronto com ID/data oficiais; não recebe templates,
    resultado bruto nem SQL. Reenvio concluído reutiliza a mesma resposta.
16. Se o redator falhar, salva `answer_failed`, motivo seguro e limpa a reserva,
    preservando snapshot/SQL validados. Reenvio da mesma mensagem retoma apenas a
    segunda chamada Gemini: não repete planejamento nem consulta. Uma nova pergunta
    faz uma consulta nova. Snapshot com owner/hash/versão inválidos não é reutilizado.

Nenhuma chamada Gemini mantém uma conexão leitora, transação de escrita ou lock
aberto. A reserva tem 90 segundos; o app aguarda até 90 segundos para o fluxo completo.

## Isolamento e permissões

- `vikash_assistant_reader`: login exclusivo, sem superuser, BYPASSRLS, criação de
  roles/bancos, herança ou memberships. SELECT somente nas sete views do catálogo.
  Sem acesso às tabelas-base, sequências ou escrita/criação de objetos permanentes.
- `vikash_assistant_view_owner`: NOLOGIN, sem privilégios administrativos/memberships.
  Possui schema/views e somente SELECT das colunas necessárias das tabelas-base.
  Não recebe e-mail, senha, transcrição ou outras colunas fora do contrato.
- Views `security_barrier` no schema `assistant_finance`: accounts, cards,
  transactions, purchases, installments, invoices e categories.
- Contexto `app.assistant_user_uuid`: UUID global do JWT resolvido pela API. Evita
  associar IDs numéricos coincidentes de bancos diferentes. Ausente, desconhecido
  ou inativo não retorna linhas; categorias padrão só aparecem com contexto válido.
- Relacionamentos internos também conferem propriedade: movimentação/conta,
  categoria personalizada e compra/parcela/fatura não misturam donos.
- `current_user`, permissões efetivas, owner/barreira das views e postura do owner
  são verificados a cada empréstimo. Adicionar grants indevidos bloqueia a execução.
- SQL validado não pode trocar sessão/usuário, chamar funções arbitrárias, ler
  tabelas-base, acessar catálogo do sistema nem gravar dados.

O isolamento depende também dessas definições confiáveis de views/permissões. Quem
administra o PostgreSQL continua sendo uma autoridade de confiança da infraestrutura.

## Limites por consulta

| Recurso | Padrão / teto da configuração |
| --- | --- |
| Conexões leitoras | 4 / máximo 4 |
| Espera por conexão | 1 segundo / máximo 3 |
| Planejamento EXPLAIN | 1 segundo / máximo 2 |
| SELECT | 2 segundos / máximo 5 |
| Espera de lock | 250 ms / máximo 1 segundo |
| Transação | 5 segundos / máximo 10 |
| Plano estimado | custo 100.000; até 1.000.000 linhas em qualquer nó; 200 nós |
| Memória de trabalho | 2 MB por operação de ordenação/hash; paralelismo desabilitado |
| Arquivos temporários | 16 MB por processo leitor |
| Saída | 100 linhas; 24 colunas; 4.096 caracteres por célula; 64 KiB de JSON |

Custo do EXPLAIN é a unidade estimada do planejador PostgreSQL, **não dinheiro** nem
um limite rígido de CPU. Timeouts e limites de saída/arquivos complementam essa
estimativa. A política SQL também limita complexidade antes do banco.

## Política SQL (financial-select-v1)

`AssistantSqlValidator` usa JSqlParser 5.4 fixado, puro Java compatível com Java 21.
A aprovação não depende da obediência do modelo ao prompt.

- Um SELECT sobre views totalmente qualificadas e colunas conhecidas do catálogo.
- Funções fechadas: agregados SUM/AVG/COUNT/MIN/MAX, COALESCE/NULLIF, ROUND/ABS,
  LOWER/UPPER/TRIM/LENGTH, DATE_TRUNC/TO_CHAR e EXTRACT com campos permitidos.
  Funções normais usam `pg_catalog`; construções especiais são recompostas.
- Valores literais e parâmetros tipados viram bindings; casts apenas para tipos
  internos permitidos. Nada de parâmetros de identidade de usuário.
- Até um JOIN por SELECT, por UUID de relacionamento conhecido. CTE não recursiva,
  subconsulta em FROM com alias e UNION ALL são permitidos dentro dos limites.
- Sem escrita, múltiplos comandos, SELECT INTO, locks, janelas, subconsulta escalar,
  CROSS JOIN, funções de sessão/espera/arquivo/rede, comentários ou quoting especial.
- Até 16.000 caracteres, 450 nós, 8 SELECTs, 4 CTEs por lista, 20 parâmetros,
  lista IN de 20 valores, 24 colunas; parser com timeout de 1 segundo.
- LIMIT externo até 100. Não injeta limites nas entradas de agregações/CTEs.
- Cache sem versão/prova/hash atual não é reutilizado como aprovação. Mudanças na
  política ou no executor exigem incrementar suas respectivas versões.

AST segura não prova interpretação financeira correta. A etapa de resposta deve
continuar tratando pergunta, nomes e descrições como conteúdo, não instruções.

## Regras financeiras do catálogo

Contrato `financial-v2-2026-10-16` em `src/main/resources/assistant/financial-catalog.json`;
prompt em `src/main/resources/prompts/financial-assistant.txt`. Sem RAG por enquanto.

Despesas de conta usam EXPENSE; pagamento de fatura é saída de caixa sem repetir
consumo; transferência própria não é receita/gasto. Compras usam o valor total na
data da compra; compromissos mensais usam parcelas. Fatura agrega saldo inicial e
parcelas uma vez. Saldo vem de contas; não há dados suficientes para reconstruir
qualquer saldo histórico ou descobrir utilização de assinaturas. Datas relativas
usam America/Sao_Paulo e fim exclusivo. Somas/divisões são feitas no PostgreSQL.

Perguntas genéricas sobre “gastos” ou “despesas” exigem escolher **consumo**
(despesas/compras sem contar novamente o pagamento da fatura) ou **saída de caixa**
(débitos das contas, incluindo faturas pagas pela data do pagamento). Informar banco,
conta, categoria ou período não resolve essa escolha. O planejador retorna `clarify`
sem SQL até o critério ficar claro. Uma escolha explícita do usuário é mantida na
memória para continuações; suposições antigas do assistente não contam como escolha.
O redator nomeia a visão e explica inclusões/exclusões. Resumos da memória v1 são
reconstruídos pelo fluxo de bootstrap das perguntas humanas para não perpetuar
um critério de consumo assumido automaticamente; mensagens e histórico são preservados. As duas visões nunca são
somadas, e excluir quitações do consumo não significa registros duplicados no banco.

## Contrato do chat e erros

- `received`: planejamento desativado.
- `planned`: SQL aprovado, execução desativada; informa que ainda não consultou dados.
- `queried`: leitura concluída, mas redação desativada no ambiente.
- `answered`: resposta financeira gerada, validada e salva oficialmente.
- `clarification`: pergunta curta do Gemini para resolver ambiguidade.
- `unsupported`: resposta fixa sobre limites do catálogo/operação.

Sucesso inclui conversationId, status, message (recibo correlacionado) e reply
(resposta oficial). Primeiro envio retorna 201; repetição concluída retorna 200.

Falhas usam códigos seguros: ASSISTANT_SQL_REJECTED (422),
ASSISTANT_QUERY_COST_LIMIT / RESULT_LIMIT / QUERY_FAILED (422),
ASSISTANT_QUERY_TIME_LIMIT (504), READER_UNAVAILABLE / ISOLATION_GUARD (503).
O prefixo `ASSISTANT_QUERY_` também se aplica aos últimos códigos. Falha preserva
pergunta, limpa reserva, registra query_failed/motivo e permite reenvio. Nenhum
resultado parcial é salvo. Erros do redator usam ASSISTANT_ANSWER_UNAVAILABLE / INVALID
(503) e ASSISTANT_ANSWER_CONTEXT_LIMIT (422), com orientação de reenvio/pergunta mais
específica. Autenticação, propriedade, limites e conflitos mantêm
401/404/409/429 conforme as etapas anteriores.

## Banco e implantação

Hibernate pode criar colunas de entidades com ddl-auto=update; **não cria views,
roles, grants ou as configurações do leitor**. Após as tabelas, aplicar:

1. migrations/2026-10-16-assistant-questions.sql
2. migrations/2026-10-16-assistant-planning.sql
3. migrations/2026-10-16-assistant-sql-validation.sql
4. migrations/2026-10-16-assistant-financial-views.sql
5. migrations/2026-10-16-assistant-reader-permissions.sql
6. migrations/2026-10-16-assistant-query-results.sql
7. migrations/2026-10-16-assistant-answers.sql
8. migrations/2026-10-17-assistant-memory.sql

As duas roles são criadas sem login inicialmente. Provisionar senha exclusiva e
LOGIN somente ao leitor; nunca compartilhar a senha principal da API. Não mudar
bancos ou grants de outras aplicações. PostgreSQL 18+ é exigido pelo executor.

No Compose local, após tabelas/migrações anteriores:

```powershell
python scripts/provision-assistant-reader.py --enable-local
docker compose -f compose.yaml -f compose.local.yaml up -d --no-deps --build api
```

O script gera/reutiliza segredo no `.env` local ignorado, aplica views/permissões e
colunas de resultado, habilita execução local e não imprime segredos. O transporte
psql recebe SQL por stdin em UTF-8, sem senha nos argumentos do processo.
Para outro ambiente, passar ASSISTANT_READER_PASSWORD por segredo de ambiente e usar
o script sem --enable-local, ou aplicar as mesmas migrações administrativamente.
Depois configurar os quatro flags e a URL da conexão exclusiva no serviço da API.
No Docker a URL interna usa postgres:5432; fora dele usa a porta local configurada.

ASSISTANT_ANSWER_ENABLED=false e ASSISTANT_EXECUTION_ENABLED=false são os padrões
versionados. Habilitar explicitamente a redação no ambiente desejado. Demais variáveis e valores
estão em .env.example, application.properties e compose.yaml. Nunca expor a credencial
leitora no app. Nenhuma dependência nativa ou alteração visual foi adicionada.

## Persistência e diagnóstico

Histórico oficial em assistant_conversations / assistant_messages. Resultado,
proposta, SQL normalizado, hashes/versões e UUID do dono são internos. A resposta
final também é persistida, com versão, hash do contexto, hash do texto e answered_at. Não cria novas
tabelas financeiras. Conversas: 50 por usuário, 200 registros por conversa contando
espaço reservado para respostas pendentes. Histórico local anterior não é importado;
exclusão/sincronização remota continua fora desta etapa.

Logs INFO com requestId registram etapa, versão, motivo seguro, duração, contagens e
custo estimado. Nunca perguntas, SQL, bindings, linhas, respostas, senha ou corpo bruto
de erro do Gemini/JDBC. O papel leitor também desativa registro de statements e
parâmetros em erros do PostgreSQL. O resultado financeiro persistido tem a mesma
sensibilidade dos dados originais e fica acessível apenas pelo backend.

## Redação, limites e contexto

A resposta usa `prompts/financial-answer.txt` separado do prompt de planejamento.
O redator não recebe ferramentas, schema completo, SQL ou instruções para consultar
mais dados. A integração utiliza o mesmo endpoint/modelo já configurado.

- Segunda chamada: até 100.000 bytes de contexto, 2.048 tokens de saída por padrão,
  conexão de 5 segundos e leitura de 25 segundos; sem retry automático no endpoint.
- Template até 4.000 caracteres; texto final até 6.000 caracteres/24.000 bytes e
  120 referências. Até 12 mensagens/24.000 bytes de histórico oficial.
- Formatos disponíveis por fato: money, number, text e date. UUIDs técnicos omitidos.
  Não calcula novos totais, médias ou porcentagens nesta fase. Não usa valores do
  histórico como evidência financeira atual; apenas resultados da consulta atual.
- Nulo é “não informado”; zero calculado continua zero; lista vazia significa que
  não foram encontrados registros para os filtros, sem inferir ausência de contas.
- Datas de filtro com fim exclusivo são identificadas pela AST, nunca por regex
  dentro de literais, e a referência traz “(não incluído)”. O template não remove
  essa marca. Listas que atingem o limite são sinalizadas ao modelo.
- Instruções em descrições/nomes/histórico não substituem o prompt. A segunda chamada
  não pode iniciar novas consultas ou modificar dados. Template/JSON é validado
  independentemente da resposta do modelo.

As referências impedem inserir cifras literais arbitrárias na prosa, mas não
provam toda a interpretação semântica do texto ou a intenção original da pergunta.
Os testes reais verificam cenários representativos; não constituem garantia de
que o modelo nunca fará uma interpretação incorreta.

## Memória incremental da conversa (financial-memory-v2)

`ASSISTANT_MEMORY_ENABLED=false` por padrão; ativado explicitamente no ambiente
local após a verificação. Não acrescenta uma chamada Gemini: a chamada existente
para planejamento retorna `plan` e `memoryUpdate` no mesmo [JSON Schema](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). O fluxo de
consulta/validação/isolamento e a chamada separada de redação continuam iguais.

A entrada combina:

- até 12 mensagens recentes, dentro dos 24.000 bytes já existentes;
- resumo de intenção até 1.400 caracteres;
- até dez filtros estruturados de 240 caracteres cada: scope, institution, account,
  card, category, paymentMethod, period, metric, comparison e criteria;
- data de referência da memória para períodos relativos não mudarem silenciosamente.

O resumo não armazena saldos/totais como fatos atuais. Filtros descrevem escopo,
banco/conta/cartão, categoria, método, período, métrica e nuances. O redator recebe
esse mesmo contexto apenas para interpretar a pergunta; números continuam vindo
exclusivamente dos fatos da consulta atual.

O modelo devolve patches: campo omitido preserva seu valor; valor novo substitui;
null remove. Toda mudança precisa trazer evidência literal da pergunta atual. Na
migração inicial, pode usar perguntas oficiais antigas/recentes, nunca respostas
financeiras do assistente. A API valida schema, nomes, duplicatas, tamanhos,
proveniência da evidência e associação ao contexto usado na chamada.

Exemplos: “e no mês passado?” altera período e mantém banco/categoria/Pix;
“na verdade Nubank e Transporte” corrige esses dois campos; “todos os bancos”
remove institution; “esqueça os critérios anteriores, quero saldo atual” limpa
critérios antigos incompatíveis. Pedido unsupported não altera a memória.

Persistência: assistant_conversations recebe memory_json, memory_hash e
memory_updated_at. O JSON inclui versão, dono/conversa, revisão e ID da pergunta
até a qual foi atualizado. Cada pergunta guarda memory_context_json/hash, um
snapshot estável do contexto. Nenhuma tabela financeira nova é criada.

O store verifica token/lease e bloqueia brevemente a conversa para gravar. Uma
pergunta antiga reenviada usa seu próprio snapshot e não sobrescreve um checkpoint
mais novo. Conclusões repetidas não geram chamadas nem atualizações duplicadas.
Falha na redação retoma a resposta com o mesmo contexto/resultado. Nenhuma chamada
Gemini mantém esse lock ou transação aberta. DynamicUpdate evita que uma atualização
de updated_at de outra requisição sobrescreva campos de memória carregados antes.

Memória com hash, versão, dono ou conversa incompatíveis é ignorada. Não há memória
global compartilhada entre usuários ou conversas. O cliente não pode fornecer ou
substituir memória/histórico oficial pelo payload. Logs registram somente revisão,
versão, tamanhos, contagens e códigos seguros, sem texto dos resumos/filtros.

Conversas anteriores ao recurso têm uma importação inicial de perguntas oficiais
anteriores (até 100, conforme o limite de mensagens da conversa), até 32.000 bytes,
junto das mensagens recentes. Isso permite recuperar critérios fora da janela de
12 mensagens. Se esse histórico exceder o orçamento, a entrada é marcada como
bootstrapLimited; o trecho parcial antigo não é usado como definitivo, e a IA deve
confirmar critérios ausentes antes de consultar. As mensagens originais não são
apagadas. Conversas novas atualizam a memória incremental a cada planejamento válido.

A memória é uma compressão limitada e pode conter erro de interpretação do modelo;
não representa memória literal ilimitada nem substitui autenticação, políticas SQL
ou consultas novas. Pergunta explícita atual prevalece, e ambiguidades relevantes
pedem esclarecimento.

## Verificação

- AssistantQueryIsolationTest: PostgreSQL 18 descartável com dois usuários, sete views,
  pool de uma conexão, concorrência, contexto ausente/inativo, parâmetros alheios,
  bloqueio de tabelas/escrita, grants indevidos, owner com login, custo/cardinalidade,
  complexidade, timeouts reais de lock/statement, tamanho de resultado, autenticação,
  prova com parâmetros, HTTP/idempotência e falta da credencial leitora sem fallback.
- AssistantExecutionPropertiesTest: padrão desativado e 20 configurações inseguras.
- Suíte completa da API em container Java 21: 625 casos, zero falhas/erros; 28
  optativos omitidos no build. Foram executados separadamente os 15 testes PostgreSQL
  de isolamento, os oito de resposta HTTP e os dois testes Gemini com nove cenários,
  todos aprovados. Os outros dois opt-ins antigos são catálogo e planejamento Gemini.
  A matriz do SQL validator contém 145 cenários.
- App: 31 testes do protocolo/chat aprovados e lint dos arquivos alterados aprovado.
- Smoke local: pergunta e continuação fictícias com Gemini real, leitura isolada,
  snapshot interno, histórico oficial, reenvio e autenticação; conta removida no fim.

Opt-in de isolamento: VIKASH_ASSISTANT_EXECUTION_TEST=true, ASSISTANT_TEST_DB_URL,
ASSISTANT_TEST_DB_PASSWORD e ASSISTANT_READER_TEST_PASSWORD. Usar **exclusivamente**
banco descartável assistant_catalog_test com administrador assistant_test.
Os opt-ins anteriores de catálogo e Gemini continuam disponíveis. Não versionar
credenciais ou relatórios contendo dados reais. Nunca apontar testes create-drop
para bancos do app/produção.

A etapa financeira do chat está integrada. Anexos, sincronização/listagem/exclusão
remota do histórico, streaming e ações de escrita continuam fora deste fluxo.

### Etapa de resposta — testes de 16/10/2026

- AssistantAnswerFormatterTest: referência exata, precisão decimal, datas exclusivas,
  nomes, contagens, nulidade, saída vazia, conteúdo inválido e limites.
- AssistantAnswerClientTest: payload mínimo, ausência de SQL/identidade/ferramentas,
  schema, orçamento, indisponibilidade, truncamento e rejeição de números inventados.
- AssistantAnswerIntegrationTest: oito cenários HTTP/PostgreSQL, incluindo snapshot
  salvo antes da resposta, recuperação sem repetir SQL, owner/prova, histórico,
  concorrência, lease vencido, resultado adulterado e limites de contexto.
- AssistantAnswerLiveTest: nove cenários no Gemini real, somente dados fictícios
  em PostgreSQL descartável. Total de consumo R$ 200,00; continuação no mês anterior
  R$ 333,00; Mercado R$ 150,00/Transporte R$ 50,00; saldo R$ 1.703,80;
  percentual 75%; zero, lista vazia, célula com prompt injection e nulo sem virar zero.
- App: 36 testes de protocolo/chat e lint aprovados. Sem alteração visual.

Opt-ins novos: VIKASH_ASSISTANT_ANSWER_POSTGRES_TEST=true (integração simulada) e
VIKASH_ASSISTANT_ANSWER_LIVE_TEST=true (Gemini real); o segundo usa também
ASSISTANT_LIVE_GEMINI_API_KEY. Ambos usam o PostgreSQL descartável e as credenciais
citadas acima. Nenhum teste automatizado usa finanças reais de pessoas.

Resultado final local: API saudável em 8082 com as três etapas habilitadas no .env
ignorado. Uma conta descartável confirmou esclarecimento, continuação, SQL isolado,
resposta financeira com zero consultado, hashes/datas persistidos e reenvio idêntico.
A conta e os registros do smoke foram removidos. Nenhum dado financeiro real foi
utilizado nos testes.

Na revisão inicial, a resposta mostrava o fim exclusivo como se fosse incluído;
a referência de data agora preserva essa exclusão explicitamente. Outra rodada
atingiu HTTP 429 do Gemini por limite de requisições por minuto e uma saída foi
rejeitada pela validação. Os testes reais passaram a respeitar espaçamento; na
rodada final os nove cenários passaram sem repetição. O endpoint não faz retries
ocultos nem mostra texto rejeitado ao usuário.

### Verificação da memória

- AssistantMemoryTest: patches, preservação/remoção, evidência, campos proibidos,
  limites, hashes, versão, dono/conversa e corte temporal.
- AssistantMemoryClientTest: memória como dados no payload, sem IDs internos e sem
  chamada extra, saída estruturada combinada de planejamento e atualização.
- AssistantMemoryIntegrationTest: conversa que ultrapassa a janela recente,
  correções/limpeza, reenvio sem atualizar memória, tentativa de sobrescrever contexto
  novo por uma pergunta antiga, isolamento por usuário/conversa e bootstrap legado.
- AssistantMemoryLiveTest: Gemini real com PostgreSQL descartável e dois usuários
  fictícios. Mensagens neutras intermediárias são inseridas pela fixture para retirar
  as definições originais/correções das últimas 12 mensagens. As perguntas financeiras,
  planejamento, atualizações da memória, SQL e respostas finais usam a integração real.

Os testes reais usam VIKASH_ASSISTANT_MEMORY_LIVE_TEST=true e as credenciais de teste
já descritas. O relatório sintético não contém chave Gemini nem dados de pessoas reais.

Resultado da entrega de memória: 625 casos na suíte Java 21, zero falhas/erros,
28 optativos omitidos no build. Os novos testes unitários/HTTP da memória foram
aprovados, e o opt-in Gemini/PostgreSQL confirmou nove cenários: filtros originais
fora da janela, correção fora da janela, limpeza, mudança de assunto, outro usuário,
outra conversa e importação de conversa legada. As respostas sintéticas esperadas
foram R$ 150,00, R$ 13,50, R$ 23,40, R$ 50,00 e saldo R$ 3.000,00. Um cenário usou
reenvio explícito após HTTP 503; o resultado/contexto foram preservados, sem retry
oculto do endpoint.

API local saudável em 8082 com ASSISTANT_MEMORY_ENABLED=true no .env ignorado.
O smoke autenticado com Gemini real confirmou resumo, filtros de escopo/período,
revisão >= 2, dono correto, hashes e snapshot por pergunta, além de reenvio sem
alterar a revisão. Conta fictícia e histórico removidos no fim. Nenhuma dependência
nova, mudança visual, commit ou push foi realizado nesta etapa.


## Respostas visuais fundamentadas

O redator retorna `template` e `blocks` na mesma chamada Gemini já existente. Não há chamada adicional para desenhar, gerar imagem ou escolher estilos. O schema fechado aceita `metric`, `pie`, `bar` e `list`; no máximo três blocos e um gráfico/lista. Títulos, legendas e destaques obedecem às referências dos fatos atuais. Valores de métrica devem referenciar uma célula numérica do resultado; colunas de gráfico devem existir e usar todas as linhas desse resultado, sem pontos inventados ou escolhidos pelo modelo. Datas de filtro continuam respeitando limites exclusivos. Cálculos e comparações financeiras continuam sendo produzidos pelo SQL, não pelo redator.

`FinancialReplyPresentation` é o contrato `financial-presentation-v1`. A API resolve referências e envia rótulo, decimal exato em string e valor já formatado em pt-BR. O JavaScript converte números somente para coordenadas do gráfico; o texto usa o formato exato da API. Gráficos com mais de doze itens, números negativos/extremos, rótulos repetidos, todos os valores zerados ou resultado potencialmente truncado viram lista. O aplicativo pagina os itens de cinco em cinco e oferece botões acessíveis equivalentes ao toque no gráfico. Não transforma soma de uma lista limitada em total geral. A apresentação é limitada a 48 KiB, sem HTML, SVG, SQL, código, URLs ou ações fornecidas pelo modelo.

A apresentação fica em `assistant_messages.presentation_json` da resposta oficial, vinculada ao hash do texto + JSON e ao mesmo usuário/conversa/snapshot. A migração é `2026-10-17-assistant-presentation.sql`; o provisionador público também a aplica. Reenvio idempotente devolve os mesmos gráficos sem chamar Gemini nem repetir SQL. Alteração indevida do JSON invalida o cache; o retry usa o snapshot íntegro para reconstruir a resposta. Respostas anteriores `financial-answer-v1` continuam legíveis. No aplicativo, o histórico local por perfil conserva a apresentação validada; metadados ausentes, desconhecidos ou corrompidos usam o texto descritivo.

`AssistantRichAnswer` mantém respostas à esquerda sem balão, valores destacados, parágrafos, legenda selecionável e origem “Dados dos seus registros no ViKash”. A data exibida é a consulta, sem alegar atualização de banco/Open Finance. Logos são exclusivamente as imagens locais existentes de instituições reconhecidas; não se aceitam imagens/URLs livres do Gemini. O Pie Chart já instalado foi reutilizado. O Bar Chart veio do MCP Reacticx, com Skia/Reanimated no nativo e adaptação SVG/CSS na web. O detector de arraste foi adaptado ao toque controlado já usado na pizza; nenhum pacote npm/nativo foi instalado. Gráficos não capturam scroll vertical, não usam Number Flow, blur ou loop por quadro em JavaScript. O chat limita a janela de renderização e memoiza cada resposta.

Escolha do gráfico é semântica: pizza para partes exclusivas de um mesmo conjunto, barras para comparação temporal/entre grupos, lista para lançamentos e métrica para pergunta escalar. O contrato valida fontes, limites e tipos, mas não prova toda interpretação da linguagem natural. Não deve afirmar média, tendência, causalidade ou vencimento se a consulta não trouxer essa evidência.

Verificação desta etapa: testes de formato/referências/limites, HTTP em PostgreSQL descartável com dois usuários, persistência/replay/adulteração, seleção/legenda/paginação/histórico local e exportações dos bundles. Três perguntas reais de dados fictícios produziram pizza, barras e saldo; seis chamadas Gemini na execução final, com intervalo mínimo de sete segundos entre CADA chamada (planejador e redator), sem chamadas extras nos replays. O ensaio inicial encontrou SQLSTATE 42803 em agrupamento parametrizado; o prompt agora exige aliases no GROUP BY/ORDER BY dessas expressões, e o cenário mensal passou. Não se fez benchmark/FPS nem teste físico de iOS/Android nesta etapa.
