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
