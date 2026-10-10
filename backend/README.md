# Backend do Vikash

## Qual Compose usar?

O `compose.yaml` contém a configuração principal da API e do PostgreSQL. Ele é usado em produção, sem publicar portas diretamente no servidor.

O `compose.local.yaml` é um complemento para desenvolvimento. Ele reutiliza os serviços do arquivo principal e acrescenta as portas necessárias para acessar a API pelo PC ou celular e o banco pelo HeidiSQL. Use os dois arquivos juntos; o arquivo local não deve ser executado sozinho.

| Configuração | Desenvolvimento local | Produção |
| --- | --- | --- |
| Arquivos utilizados | `compose.yaml` + `compose.local.yaml` | Somente `compose.yaml` |
| Acesso à API | `http://localhost:8082` ou `http://IP_DO_PC:8082` | Domínio HTTPS configurado no proxy |
| Porta da API publicada no host | `8082`, configurável por `LOCAL_API_PORT` | Nenhuma no arquivo Compose |
| Acesso ao PostgreSQL pelo host | `127.0.0.1:5433`, configurável por `LOCAL_DB_PORT` | Sem porta publicada |
| Porta interna da API | `8080` | `8080` |
| Conexão interna ao banco | `postgres:5432` | `postgres:5432` |

As variáveis `LOCAL_API_PORT` e `LOCAL_DB_PORT` só têm efeito quando o arquivo local está incluído. O Compose de produção não utiliza essas variáveis.

## Começar no ambiente local

Instale o Docker com suporte ao Docker Compose e mantenha o Docker em execução. Entre na pasta `backend`. Caso ainda não tenha um `.env`, crie-o a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Preencha o `.env` com as credenciais do banco, os secrets JWT e a chave do Gemini. Configure também o SMTP para testar o envio dos e-mails de recuperação de senha. Em seguida, execute:

```powershell
docker compose -f compose.yaml -f compose.local.yaml up -d --build
```

Esse comando compila a API, executa os testes do build e inicia os dois serviços. A API aguarda o PostgreSQL estar disponível antes de iniciar. Para recompilar após alterar o backend, execute novamente o mesmo comando.

Com as portas padrão, os acessos são:

- API no PC: `http://localhost:8082`.
- API no celular: `http://IP_DO_PC:8082`, usando a mesma rede do PC.
- PostgreSQL no HeidiSQL: host `127.0.0.1`, porta `5433`, banco `vikash_db` e credenciais do `.env`.

As portas podem ser alteradas com `LOCAL_API_PORT` e `LOCAL_DB_PORT` no `.env`. A API local é publicada nas interfaces do PC para permitir os testes pelo celular; o PostgreSQL é publicado apenas em `127.0.0.1`, para acesso pelo próprio PC.

A API usa `postgres:5432` pela rede interna do Compose. Ela não depende da porta publicada para o HeidiSQL, e o fechamento dessa porta em produção não impede a conexão da API com o banco.

Para apontar o app para essa API, configure `EXPO_PUBLIC_API_URL=http://IP_DO_PC:8082` no `app/.env`. Para o navegador, configure também `VITE_API_URL=http://localhost:8082`. Reinicie o servidor do app depois de alterar essas variáveis.

Para acompanhar os logs:

```powershell
docker compose -f compose.yaml -f compose.local.yaml logs -f api
```

Para parar os serviços preservando o banco:

```powershell
docker compose -f compose.yaml -f compose.local.yaml stop
```

## Executar em produção

Em produção, use somente `backend/compose.yaml` e configure as variáveis de ambiente da aplicação usando `.env.example` como referência. O `compose.local.yaml` não deve ser incluído no deploy.

Configure um proxy reverso com HTTPS para receber as requisições do domínio e encaminhá-las ao serviço `api`, na porta interna `8080`, pela rede Docker. O proxy precisa estar conectado à rede do serviço. Essa porta pertence ao container: ela não ocupa a porta `8080` do servidor.

Para iniciar os serviços, execute na pasta `backend`:

```bash
docker compose -f compose.yaml up -d --build
```

Esse comando inicia os serviços sem expor portas no host. O acesso público à API depende da configuração do proxy reverso.

O PostgreSQL permanece acessível aos serviços da rede Docker, sem acesso direto pela internet. Os dados são persistidos no volume `postgres_data`, tanto na configuração local quanto na de produção.

## Novas instituições financeiras

O script `migrations/2026-10-09-add-financial-institutions.sql` cadastra as 13 instituições adicionais e a opção `Outra instituição`. Execute no banco local ou no banco de produção que deseja atualizar. Ele não duplica instituições já cadastradas e preserva seus IDs.

Na pasta `backend`, com o banco local em execução:

```powershell
Get-Content -Raw -Encoding utf8 migrations/2026-10-09-add-financial-institutions.sql | docker compose -f compose.yaml -f compose.local.yaml exec -T postgres sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
```

Também é possível abrir o script no HeidiSQL, selecionar o banco `vikash_db` e executá-lo. No servidor de produção, execute o mesmo arquivo na instância de PostgreSQL do Vikash.

O endpoint `/api/institutions` já retorna os novos registros após a execução, sem precisar recompilar a API. As logos WebP estão incluídas no app; a opção genérica usa um ícone vetorial, sem download de imagem.

## Cartões com limite já comprometido

Antes de atualizar uma API que já possui dados, execute `migrations/2026-10-09-credit-card-initial-balances.sql` no banco correspondente. O script adiciona as colunas com valor zero para os registros existentes, preserva os dados e pode ser executado novamente. Ele também cria restrições para impedir valores iniciais negativos no banco.

Com o banco local em execução, use na pasta `backend`:

```powershell
Get-Content -Raw -Encoding utf8 migrations/2026-10-09-credit-card-initial-balances.sql | docker compose -f compose.yaml -f compose.local.yaml exec -T postgres sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
```

No servidor, execute esse arquivo no PostgreSQL da aplicação antes do deploy. Também é possível executá-lo pelo HeidiSQL. As migrações desta pasta são manuais; o Compose não as executa automaticamente.

### Cadastro

`POST /api/credit-card` aceita `availableLimit` além dos campos anteriores:

```json
{
  "financialInstitutionId": 1,
  "description": "Meu cartão",
  "creditLimit": 5000,
  "availableLimit": 2800,
  "closingDay": 3,
  "dueDay": 10
}
```

A resposta continua sendo `201`, sem body. Nesse exemplo, `2200` ficam comprometidos, inicialmente sem distribuição em faturas. O limite disponível pode ser zero, mas não pode ser negativo nem superar o limite total. Se o campo for omitido, todo o limite fica disponível, mantendo a compatibilidade com os cadastros atuais do app.

O cadastro não cria compras, parcelas ou movimentações na conta. A edição normal do cartão, por `PUT /api/credit-card/update/{uuid}`, mantém o valor inicial comprometido.

### Distribuir ou corrigir valores iniciais

Use `PATCH /api/credit-card/{uuid}/initial-invoices`, autenticado como o dono do cartão:

```json
{
  "invoices": [
    {
      "referenceMonth": "2026-10",
      "initialAmount": 800,
      "closingDate": "2026-10-03",
      "dueDate": "2026-10-10"
    },
    {
      "referenceMonth": "2026-11",
      "initialAmount": 700,
      "closingDate": "2026-11-03",
      "dueDate": "2026-11-10"
    }
  ]
}
```

A resposta é `204`, sem body. Restam `700` sem distribuição, e o limite disponível continua em `2800`.

`initialAmount` é o valor inicial final desejado para aquele mês, e não um acréscimo. Reenviar o mesmo JSON não duplica a dívida. Para reduzir um valor ou movê-lo para outro mês, envie os novos valores das faturas afetadas no mesmo lote. O valor reduzido volta ao saldo ainda não distribuído. Faturas omitidas permanecem como estão. Definir zero remove apenas o valor inicial, preservando a fatura e suas compras; se não houver fatura naquele mês, zero não cria uma fatura vazia.

Cada lote aceita entre 1 e 120 faturas, sem repetir meses. O vencimento deve ser posterior ao fechamento e pertencer ao mês de referência. Se a fatura já existir, informe suas datas atuais; as compras e parcelas existentes são preservadas. Faturas novas ficam abertas quando o fechamento está no futuro, ou fechadas quando essa data já chegou, considerando `America/Sao_Paulo`. Faturas pagas não podem ter seus valores iniciais alterados. Cartões arquivados não aceitam distribuição.

O lote inteiro é confirmado ou revertido. Distribuições, compras e pagamentos utilizam o bloqueio do cartão para coordenar operações simultâneas. Erros de configuração retornam `400` com `fieldErrors`; cartão inexistente ou de outro usuário retorna `404`.

### Consultas e pagamento

As respostas de cartões, inclusive as do dashboard, acrescentam `usedLimit` e `unallocatedUsedLimit`. Os detalhes em `GET /api/credit-card/{uuid}` também acrescentam:

- `allocatedInitialAmount`: soma dos valores iniciais distribuídos, incluindo faturas já pagas.
- `initialCommittedAmount`: valor inicial distribuído mais o que ainda falta distribuir. Mantém o histórico inicial mesmo após pagamentos.

As respostas das faturas expõem `initialAmount` separadamente. O `total` soma esse valor às parcelas das compras registradas. O extrato paginado da fatura continua retornando somente as parcelas reais.

O cálculo do limite é:

```text
limite utilizado = valores totais das faturas não pagas + valor ainda não distribuído
limite disponível = limite total - limite utilizado
```

O pagamento integral, pelo endpoint existente ou por comando de voz, usa o total completo da fatura. Uma fatura composta apenas pelo valor inicial também pode ser paga depois do fechamento. Pagar a fatura de `800` do exemplo reduz o saldo da conta em `800` e aumenta o limite disponível para `3600`, sem mexer nos `700` ainda não distribuídos.

Os valores iniciais não entram no gráfico de gastos por categoria, pois não representam compras categorizadas registradas no app. O pagamento gera uma única movimentação do tipo `INVOICE_PAYMENT` na conta. Compras novas continuam criando suas parcelas normalmente e consumindo limite adicional.

### Resumo de crédito no dashboard

`GET /api/dashboard/credit?year=2026&month=10` retorna o resumo de crédito do usuário autenticado.
O parâmetro opcional `creditCardUuid` filtra apenas este resumo por um cartão do próprio usuário.
O endpoint principal `GET /api/dashboard` mantém os dados e o contrato existentes.

- `purchasesTotal` e `purchaseCount`: valor integral e quantidade das compras realizadas no mês, pela data da compra.
- `invoicesTotal`: parcelas e valores iniciais das faturas com esse mês de referência, incluindo faturas pagas.
- `monthlyPurchases`: seis meses até o período selecionado, com total e quantidade de compras; meses sem compras retornam zero.
- `expensesPerCategory`: categorias das compras realizadas no período, pelo valor integral. Categorias personalizadas e padrão são agrupadas separadamente.
- `upcomingInvoices`: até seis faturas pendentes com valor positivo, ordenadas pelo vencimento, incluindo atrasadas. São pendências atuais e não dependem do mês histórico selecionado.
- `recentPurchases`: as últimas cinco compras, independentemente do mês selecionado, ordenadas pela data e pelo ID. Cada compra aparece uma vez, com valor total, cartão, categoria e quantidade de parcelas.

No `GET /api/dashboard`, `expensesPerCategory` contém apenas gastos das contas no mês selecionado. As categorias de crédito vêm do endpoint de crédito acima. As movimentações recentes do app usam abas separadas: até cinco transações de contas e até cinco compras no crédito, ambas independentemente do período.

Uma compra de `1200` em 12 parcelas entra como `1200` em compras no mês em que ocorreu e como `100` em cada fatura correspondente. O valor comprometido ainda não distribuído não entra nos totais de faturas.
Esses dados não são somados às saídas de contas, evitando contar a compra e o pagamento da fatura duas vezes.
Cartões de outro usuário retornam `404`; períodos e parâmetros inválidos retornam `400`. Nenhuma alteração de schema é necessária.

### Excluir transações e compras

Os endpoints autenticados `DELETE /api/transaction/{uuid}` e `DELETE /api/credit-card-purchase/{uuid}` retornam `204`, sem body. O UUID deve pertencer ao usuário da sessão; lançamentos inexistentes ou de outro usuário retornam `404`.

Excluir uma entrada subtrai seu valor da conta; excluir uma saída devolve seu valor; excluir uma transferência reverte os saldos das duas contas. Excluir um pagamento de fatura devolve o valor à conta e reabre a fatura como `CLOSED`, aguardando pagamento. A reversão e a exclusão são feitas na mesma transação do banco.

Excluir uma compra remove **todas as suas parcelas**, inclusive as de outros meses. Os totais das faturas e o limite disponível são recalculados pelas parcelas restantes. As faturas, outras compras e valores iniciais do cartão são preservados. Se alguma parcela estiver em fatura paga, a API retorna `400`: é necessário excluir o pagamento dessas faturas antes de excluir a compra. Uma segunda exclusão do mesmo UUID retorna `404`, sem repetir a reversão.

### Editar transações e compras

Use `PUT /api/transaction/{uuid}` para transações de conta e `PUT /api/credit-card-purchase/{uuid}` para compras. Ambos exigem autenticação do proprietário e retornam `200`, sem body. Exemplo de uma saída de conta:

```json
{
  "description": "Mercado",
  "amount": 120.50,
  "paymentMethod": "PIX",
  "accountUuid": "uuid-da-conta",
  "creditCardUuid": null,
  "destinationAccountUuid": null,
  "defaultCategoryName": "Mercado",
  "customCategoryUuid": null
}
```

Informe apenas uma categoria: `defaultCategoryName` ou `customCategoryUuid`; ambos nulos removem a categoria. Para crédito, envie `paymentMethod: "CREDIT_CARD"`, `creditCardUuid` e `accountUuid: null`. Transferências mantêm seu tipo e exigem duas contas próprias distintas. Entradas e pagamentos de fatura não aceitam crédito.

A edição reverte o efeito anterior e aplica o novo valor na conta escolhida. Uma saída pode virar compra no crédito (uma parcela), ou uma compra pode virar uma única saída de conta pelo valor total, removendo todas as parcelas. Nessas conversões, o UUID, a data do lançamento e a transcrição são mantidos; o registro passa a usar o endpoint de detalhes do novo tipo.

Compras que continuam no crédito preservam a quantidade de parcelas. Alterar o valor recalcula as parcelas, distribuindo os centavos restantes nas últimas. Trocar o cartão refaz as parcelas conforme os ciclos do novo cartão; se a fatura de destino não estiver aberta, a alteração inteira é revertida. Totais e limites são calculados pelas parcelas restantes; valores iniciais e outras compras são preservados.

Se alguma parcela estiver em fatura paga, só descrição e categoria podem mudar. Alterações financeiras exigem desfazer o pagamento primeiro. Pagamentos de fatura podem mudar descrição, conta e forma de pagamento, mantendo o valor integral, a fatura e seu status pago. A conta escolhida deve ter saldo para o pagamento. Recursos de outros usuários não são aceitos. Falhas de validação retornam `400`, com `fieldErrors`; lançamentos inexistentes ou de outros usuários retornam `404`. Todas as mudanças de cada edição são atômicas.
