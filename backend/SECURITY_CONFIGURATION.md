# Limites de requisições

O Compose atual executa uma instância da API. Os contadores abaixo ficam em memória
nessa instância e são reiniciados quando a API reinicia. Antes de executar várias
réplicas, mova os contadores para um armazenamento compartilhado, como Redis, ou
aplique os mesmos limites em um gateway único.

## Login

Configure no `.env`:

- `LOGIN_EMAIL_LIMIT=10`: tentativas por e-mail normalizado.
- `LOGIN_ORIGIN_LIMIT=100`: tentativas por endereço de origem.
- `LOGIN_WINDOW_SECONDS=900`: janela de 15 minutos a partir da primeira tentativa.

Todas as tentativas contam, inclusive as bem-sucedidas. A verificação acontece
antes da busca com bloqueio e da comparação da senha. O limite é igual para
e-mails cadastrados e desconhecidos. A resposta `429` inclui `Retry-After` em segundos.

A origem vem de `getRemoteAddr()`. Não habilite processamento de `Forwarded` ou
`X-Forwarded-For` sem configurar um proxy confiável que remova cabeçalhos enviados
pelo cliente. Atrás de um proxy, o limite de origem pode ser compartilhado por seus
usuários. O limite por e-mail continua valendo entre origens diferentes.

Os contadores expirados são removidos. Há no máximo 10.000 chaves; atingir esse
limite rejeita novas chaves até haver espaço, preservando os bloqueios existentes.

## Análise por voz

- `AI_PER_MINUTE=5`: análises por usuário em 60 segundos.
- `AI_PER_DAY=50`: análises por usuário em 24 horas.
- `AI_GLOBAL_PER_DAY=500`: análises na instância em 24 horas, somando todos os usuários.
- `AI_PER_USER_CONCURRENT=1` e `AI_GLOBAL_CONCURRENT=4`: análises simultâneas.
- `AI_MAX_INPUT_BYTES=100000`: tamanho máximo do JSON com transcrição e contexto em UTF-8.
- `AI_MAX_OUTPUT_TOKENS=2048`: limite de tokens na resposta do Gemini, com um único candidato.

As janelas começam na primeira tentativa. Falhas também consomem a cota; atingir
qualquer limite retorna `429` com `Retry-After`. A vaga simultânea é liberada ao
terminar, inclusive em caso de erro. Há no máximo 10.000 usuários nos contadores.

O contexto é lido em uma transação curta, a chamada ao Gemini acontece sem
transação aberta e o resultado é validado e gravado em outra transação curta.
As contas continuam sendo bloqueadas e seus saldos recarregados antes da alteração.
Se a gravação falhar, as alterações financeiras são revertidas juntas.

Essas cotas reduzem o consumo, mas não representam um orçamento em reais. Configure
também cotas no projeto do provedor. Elas são locais à instância, como os limites de login.
