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
