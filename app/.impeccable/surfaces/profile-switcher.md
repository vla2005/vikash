# Troca de perfis

Target: `src/components/ProfileSwitcherDrawer.jsx`, avatar em `src/navigation/MainTabs.jsx` e acesso em `src/screens/LoginScreen.jsx`.
Mode: Operate. Extensão do sistema existente; preservar `DESIGN.md`.

## Direction contract

THESIS: Alternar entre contas conhecidas pelo avatar, com identificação clara do perfil em uso e uma entrada simples para adicionar outra conta.

OWN-WORLD: Drawer branco, cantos de 28px, fundo escurecido separado do movimento do painel, azul e azul suave do tema, Plus Jakarta Sans e ícones Phosphor existentes.

STORY: A pessoa reconhece nome e e-mail, escolhe uma conta e vê seus próprios dados. Sessões expiradas pedem novo login somente daquela conta. Sair exige confirmação e preserva as demais sessões.

FIRST VIEWPORT: Título e fechar no topo; lista com iniciais, nome e e-mail; perfil ativo com check e “Em uso”; sair como ação separada. “Adicionar conta” após a lista e “Meu perfil” abaixo.

FORM: Drawer existente como primeira escolha de integração. Nenhuma geração de nova identidade, seed ou raster: composição herdada do app.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Validação

Capturas web desktop e 360px com usuários fictícios. Verificados troca, falha de conexão, nova tentativa, cancelamento da adição, confirmação de saída e fechamento por Escape. Testes cobrem persistência separada, rotação de tokens, sessão expirada e descarte de requisições do perfil anterior. Android/iOS reais não foram exercitados nesta entrega.
