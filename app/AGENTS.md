# Instruções para agentes

## Reacticx — UI e animações

Este projeto utiliza Reacticx como fonte prioritária de componentes visuais e animados.

### Regras obrigatórias

1. Antes de criar um componente visual, consultar a skill `using-reacticx`.
2. Utilizar o MCP `reacticx` para pesquisar componentes relevantes no catálogo.
3. Priorizar componentes Reacticx quando atenderem aos requisitos visuais, funcionais e de desempenho.
4. Consultar implementações, exemplos, propriedades e dependências antes da integração.
5. Personalizar os componentes para a identidade visual do aplicativo, evitando a aparência de interfaces genéricas.
6. Não instalar componentes desnecessários nem substituir componentes existentes sem justificativa.
7. Antes de adicionar dependências nativas, verificar as versões instaladas e a compatibilidade com o projeto.
8. Priorizar fluidez no Android e iOS. Evitar animações custosas, renders desnecessários e trabalho contínuo na thread JavaScript.
9. Testar animações complexas em dispositivos físicos sempre que possível.
10. Quando nenhum componente Reacticx for adequado, implementar uma solução personalizada utilizando as tecnologias já existentes no projeto.
11. Se a skill `using-reacticx` ou o MCP `reacticx` estiver indisponível, informar isso explicitamente antes de prosseguir. Nunca afirmar que o catálogo foi consultado sem consultá-lo.
