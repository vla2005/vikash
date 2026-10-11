# Aparência do aplicativo

Mode: Operate. Sistema de temas em todas as telas, mantendo a identidade do Vikash.

## Direction contract

THESIS: Ler e registrar finanças com conforto em ambientes claros e escuros, sem mudar organização, dados ou navegação.

OWN-WORLD: No claro, paleta incumbente azul/branco. No escuro, canvas #101727, painéis #1B2538, texto #F0F4FF e seleção azul #9AB0FF. A família Plus Jakarta Sans, ícones e geometria existentes permanecem.

STORY: O app acompanha o sistema por padrão. Em Meu perfil, Aparência permite escolher Sistema, Claro ou Escuro. A preferência persiste no aparelho, inclusive ao trocar de perfil.

FIRST VIEWPORT: Perfil mantém identidade e dados pessoais. Aparência é uma seção com três ações nomeadas e marca de seleção; a mudança atualiza telas e sobreposições sem remontar formulários.

FORM: Extensão dos tokens semânticos e dos componentes canônicos. Não há nova identidade nem seleção aleatória de direção visual.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Verificação desta extensão

- Capturas dos dois temas nas 23 telas, incluindo os trechos inferiores, seis sobreposições, seletores e estados vazio, erro e carregamento das listas. Larguras de 320 e 768 px nas telas-chave, além da matriz principal de 390 px.
- Tema do sistema, preferência manual, restauração, falhas de armazenamento e preservação de campos cobertos pelos testes. A suíte completa passou: 51 suítes e 420 testes.
- Lint sem erros, build web, exportação Hermes Android/iOS e configuração nativa verificados. A revisão visual independente se limita ao React Native Web e ao código.
- Após gerar novos APK e IPA, validar nos aparelhos barras do sistema, teclado, áreas seguras, fontes ampliadas e abertura de drawers nos dois temas. Nenhuma aprovação visual nativa foi presumida.

Não há raster novo nesta extensão. As logos existentes mantêm as fontes e a procedência já documentadas.

Veredito final: `ship` no escopo React Native Web/código; sem correções materiais pendentes nesse escopo. `PRODUCT.md`, `DESIGN.md` e `.impeccable/design.json` reconciliados com a implementação. A verificação visual nos aparelhos continua como etapa após as novas builds.
