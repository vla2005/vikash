# Cor e hierarquia no Vikash

Mode: Operate. Extensão cromática autorizada para todas as telas nos dois temas.

THESIS: A cor ajuda a reconhecer saldo, direção do dinheiro, categorias e ações antes de ler todos os detalhes.

OWN-WORLD: Manter a marca Vikash e Plus Jakarta Sans. Azul vivo concentra saldo e identidade; verde indica entradas, coral indica saídas, âmbar pede atenção e violeta identifica apoio. Painéis neutros dão contraste a esses papéis. Categorias têm acentos próprios para claro e escuro, sem a mistura excessiva com branco.

STORY: Saldo atual primeiro, período e fluxo mensal depois; gráfico com categorias identificáveis; listas e detalhes repetem os mesmos significados. Perfil e formulários usam ícones, seleção e feedback consistentes. Valores e ações da API permanecem.

FIRST VIEWPORT: Dashboard com saldo azul, resumo mensal legível, entradas e saídas em pares coloridos. Categorias com ícones em superfícies de cor sólida, nomes visíveis e espaço confortável entre linhas.

FORM: Componentes BalanceCard, FinancialMetric e IconTile reutilizam os tokens canônicos. Categoria oferece badge suave para listas densas e vivid para grade/prévia. Não há raster novo, fonte nova ou biblioteca nova.

## Restrição obrigatória

A pilha de cartões sobrepostos, seu desenho e suas animações ficam preservados. Não editar HomeCreditCards.jsx nem os algoritmos/constantes de cores das instituições.

## Verificação

Conferir todas as telas e sobreposições em claro/escuro, contraste dos pares, ocultação de valores, carregamento, erro, listas vazias e larguras de celular/tablet. A inspeção web e a exportação de bundles não equivalem a aprovação visual no aparelho nativo.
