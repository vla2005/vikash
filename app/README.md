# Vikash — novo app

Expo SDK **57**, React Native **0.86.3**, React **19.2.3** e código de interface em **JavaScript/JSX**, sem TypeScript. A versão do React Native segue a compatibilidade do Expo Go. O app anterior permanece em `../app-legacy`.

## Escopo desta etapa

- Login com validação visual, mostrar/ocultar senha e acesso ao cadastro.
- Cadastro com nome, e-mail, senha e confirmação; segue para a primeira conta.
- Criação de conta com descrição, saldo em reais e tipo: conta corrente, poupança, carteira ou investimentos.
- Seletor opcional de instituição financeira que consulta `GET /api/institutions` ao abrir. A busca filtra os nomes retornados pela API, ignorando acentos e maiúsculas. Mostra carregamento, erro com nova tentativa e lista vazia. Carteira não consulta instituições.
- Logos locais em WebP de 96 × 96 px, aproximadamente 35 KB no total. As fontes estão documentadas em `assets/institutions/FONTES.md`.
- Resumo com saldo total, adicionar outra conta e editar as existentes.
- Identidade visual baseada nas referências aprovadas, com a logo em `assets/brand`.

**Somente o seletor de instituições está conectado à API.** Login, cadastro e criação de contas continuam visuais e sem persistência. O estado em `OnboardingContext` é perdido ao reiniciar. Entrar não verifica credenciais. Recuperação de senha exibe um aviso temporário. “Começar a usar” conclui a apresentação do resumo; o dashboard será implementado em outra etapa. Nenhuma senha é armazenada no contexto.

## API de instituições

O seletor espera uma lista JSON de objetos `{ "id": 1, "name": "Itaú", "logoUrl": "/images/financial-institutions/itau.webp" }`. Usa os IDs reais do banco e guarda a instituição selecionada no estado temporário, permitindo mostrar nome e logo no resumo e na edição sem novas consultas nesses lugares.

As logos WebP já incluídas no app são associadas pelo nome do arquivo em `logoUrl`. Logos novas usam a URL fornecida pela API; caminhos relativos à raiz usam o endereço do backend. Se a imagem não carregar, aparece o ícone de banco.

No Expo Go, o endereço padrão é o host do Metro na porta 8080. No web, é `http://localhost:8080`. Para outro endereço, copie `.env.example` para `.env` e configure `EXPO_PUBLIC_API_URL` (Expo Go e Expo web). A prévia Vite aceita essa variável e também `VITE_API_URL`, que tem prioridade no Vite. Reinicie o servidor após alterar as variáveis.

O login visual ainda não fornece JWT. Se o backend exigir autenticação nessa rota, o seletor mostra o erro de acesso. A configuração de segurança do backend não foi alterada.

## Executar

Use Node.js 22.11 ou superior e instale as dependências na pasta `app`:

```sh
npm install
```

### Prévia das telas no navegador

```sh
npm run web
```

Abra `http://localhost:5173`. A prévia usa React Native Web e adaptações próprias para navegação, SVG e área segura. Ela permite conferir o fluxo visual, mas não substitui a conferência em dispositivo nativo.

### Expo Go no celular

```sh
npm start -- --clear
```

Abra o Expo Go compatível com SDK 57 e leia o QR code. O celular e o computador devem estar na mesma rede. Execute o comando dentro de `app` e encerre o servidor anterior antes de reiniciar.

Para abrir em um emulador Android já configurado:

```sh
npm run android
```

Para abrir no simulador iOS, em macOS com Xcode:

```sh
npm run ios
```

## Organização

- `src/screens`: telas de login, cadastro, criação e resumo de contas.
- `src/components`: campos, botões, logo, ícones e seletores compartilhados.
- `src/theme`: cores e tipografia.
- `src/contexts`: estado temporário do fluxo.
- `src/navigation`: navegação nativa e adaptação para a prévia web.
- `src/utils`: validação e formatação monetária.
- `src/web`: entrada e adaptações usadas somente pela prévia.

## Verificações

```sh
npm run lint
npm test
npm run build:web
```

Os testes verificam validação, moeda, passagem do cadastro para contas, criação e edição. A execução em aparelho precisa ser conferida no Expo Go. As pastas nativas vieram do projeto inicial criado com Community CLI; para uma futura compilação própria, será necessário sincronizá-las com a configuração Expo antes de construir.
