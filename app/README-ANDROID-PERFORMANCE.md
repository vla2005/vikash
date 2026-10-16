# Guia de Performance Android & Regras para Agentes de IA (`Vikash`)

> **ATENÇÃO (Instrução obrigatória para IAs e Desenvolvedores):**  
> O iOS (CoreAnimation / Metal) tolera transparências sobrepostas, múltiplos blurs e recálculos leves de layout muito melhor que o pipeline de renderização do Android (`RenderThread` / `hwui` / Skia OpenGL/Vulkan).  
> Antes de criar ou alterar qualquer tela, componente, animação ou shader neste repositório, **leia e siga estritamente as regras abaixo**.

---

## 1. GPU Overdraw: Superfícies Translúcidas, Sombras e Reflexos no Scroll

### O que causava travamento no app
- Cards empilhados dentro de `ScrollView` / `FlatList` usando cores semitransparentes (`rgba(255, 255, 255, 0.05)`), combinados com `LinearGradient` de reflexo superior, `elevation` / `boxShadow` e luz ambiente (`AmbientLight`) ao fundo.
- No Android, cada camada translúcida sobreposta força a GPU a sombrear o mesmo pixel 4 a 6 vezes por frame (**Overdraw 4x+**), derrubando o scroll de 120 FPS para ~25–35 FPS.

### Regra obrigatória (`src/config/renderingEffects.js` & `src/theme/silver.js`)
- **NUNCA** use fundos de cards translúcidos (`rgba`), sombras dinâmicas por card ou gradientes de reflexo em listas no Android.
- **SEMPRE** consulte `renderingEffects` (`src/config/renderingEffects.js`) e use superfícies **100% opacas** (`#14161F`, `#181A24`) com **Double-Bezel** (borda especular de `1px` em `borderColor`) no Android.

```jsx
// ❌ NÃO FAÇA no Android (causa overdraw severo durante a rolagem):
<View style={{ backgroundColor: 'rgba(255,255,255,0.06)', elevation: 8 }}>
  <LinearGradient colors={['rgba(255,255,255,0.18)', 'transparent']} />
  {children}
</View>

// ✅ FAÇA (superfície opaca no Android via renderingEffects + GlassPanel):
<GlassPanel variant="default">
  {children}
</GlassPanel>
```

---

## 2. Animações de Layout (Yoga) vs. Transformações de GPU (UI Thread)

### O que causava travamento no app
- Animar propriedades de layout (`width`, `height`, `left`, `top`, `padding`, `margin`) a cada frame em abas da barra inferior (`GlassDock.jsx`) ou em barras de progresso.
- No Android, alterar `width` ou `height` por frame aciona o motor Yoga e invalida a árvore de `RenderNode` nativa a cada tick.

### Regra obrigatória (`src/components/motion/AnimatedPrimitives.jsx`)
- **NUNCA** anime `width` ou `height` em barras de progresso, indicadores ou abas no Android.
- **SEMPRE** anime apenas `transform` (`translateX`, `translateY`, `scale`, `scaleX`, `scaleY`) e `opacity` na UI thread via Reanimated 4.
- Para barras de progresso horizontais, use `<AnimatedProgressBar />`, que mantém `width: '100%'` fixo e anima `scaleX` com `transformOrigin: 'left center'`.

```jsx
// ❌ NÃO FAÇA (recalcula layout Yoga a cada frame):
const barStyle = useAnimatedStyle(() => ({
  width: `${progress.get() * 100}%`,
}));

// ✅ FAÇA (100% GPU via matriz de transformação afim):
const barStyle = useAnimatedStyle(() => ({
  transform: [{ scaleX: Math.max(0.001, progress.get()) }],
}));
```

---

## 3. Uso Correto (e Perigos) do `renderToHardwareTextureAndroid`

### O que causava travamento no app
- Deixar `renderToHardwareTextureAndroid={true}` ligado **permanentemente** em um container de tela cheia (`ScreenTransition.jsx`) que possui filhos animando internamente (`StaggeredSection`, gráficos `Svg`, `ScrollView` ou `<Canvas>` Skia).
- Quando um filho muda dentro de uma view com `renderToHardwareTextureAndroid={true}`, a `RenderThread` do Android precisa **invalidar, realocar e re-renderizar o buffer FBO inteiro da tela** em todos os frames!
- Além disso, aninhar várias `StaggeredSection` com `renderToHardwareTextureAndroid={true}` dentro de um `ScreenTransition` com `renderToHardwareTextureAndroid={true}` criava 7 texturas FBO simultâneas na troca de abas.

### Regra obrigatória
- **NUNCA** ative `renderToHardwareTextureAndroid={true}` em containers de tela cheia que contenham `ScrollView`, `<Canvas>` Skia ou sub-animações contínuas.
- **USE** `renderToHardwareTextureAndroid` **somente** em elementos folha de geometria estática durante um movimento curto (ex.: um cartão de crédito individual em `ScrollableCreditCardStack.jsx` ou a cápsula de voo `assistant-open-flight` em `AssistantDockMotion.jsx`), ou desligue-o assim que a animação estacionar (`slide.get() !== 0` em `DrawerPanel.jsx`).

---

## 4. Transições de Abas no Bottom Navigator (`MainTabs.jsx`, `GlassDock.jsx` & `runSceneUpdate.js`)

### O que causava atraso na troca de abas no Android (enquanto no iPhone era instantâneo)
1. **`startTransition` atrasando o estado `selected` exclusivamente no Android (`src/utils/runSceneUpdate.js`):**
   - `runSceneUpdate.js` envolvia `setSelected(key)` em `startTransition(update)` **apenas** quando `Platform.OS === 'android'` (no iOS executava `update()` de forma síncrona).
   - No React 19 + React Native New Architecture (Fabric), marcar `setSelected` como transição de baixa prioridade fazia o React adiar tanto a troca da tela quanto a atualização da prop `selected` do `BottomNavigator` em **150ms a 300ms**, cedendo a vez para eventos de `onPressOut`, callbacks de rede e ticks de animação.
2. **Animação da cápsula (`GlassDock.jsx`) esperando o re-render completo da tela pai:**
   - Em `GlassDock.jsx`, a mola da lente ativa (`index.set(withSpring(selectedIndex, settle))`) só era disparada dentro de um `useEffect` **após** `MainTabs` terminar de renderizar a nova tela inteira. Além disso, `onPressOut` disparava uma mola desnecessária (`pressed.set(withSpring(0, settle))`) mesmo ao clicar em abas inativas.
3. **Desmontagem e remontagem completa (~400 views nativas Android) a cada troca de aba (`MainTabs.jsx`):**
   - Cada vez que o usuário trocava entre `Home`, `Extrato`, `Contas` e `Categorias`, a aba anterior era 100% desmontada e a nova aba era montada do zero: inflando centenas de `android.view.View` via JNI, perdendo o estado dos hooks (`useDashboard`, `useTransactions`, `useAccounts`, `useCreditCards`, `useCategories`), exibindo skeletons de carregamento e refazendo todas as requisições HTTP.
4. **Concorrência de animações na montagem da aba (`StaggeredSection`):**
   - `ScreenTransition.jsx` já animava a entrada da tela inteira (`translateX` + `opacity`), mas a tela recém-montada disparava simultaneamente 6 animações `StaggeredSection`, forçando o Android a compor 7 camadas de opacidade ao mesmo tempo.

### Regra obrigatória
- **NUNCA** envolva o estado `selected` da barra de navegação em `startTransition` se a mesma variável de estado controla o feedback visual da aba ativa (`runSceneUpdate.js` deve executar `update()` de forma síncrona).
- **SEMPRE** dispare a animação Reanimated da aba ativa (`index.set(withSpring(...))`) **imediatamente dentro do `onPress` (`handleSelect`)** em `GlassDock.jsx`, na UI thread, no exato milissegundo do toque — antes mesmo do React iniciar o re-render da tela.
- **SEMPRE** mantenha as 4 abas principais já visitadas montadas em memória no Android (`visitedTabs` + `display: 'none'` em `MainTabs.jsx`), evitando destruir/recriar 400+ views nativas e preservando os dados já carregados em cache.
- **NUNCA** empilhe animações de entrada redundantes no Android quando `ScreenTransition` já está animando a cena inteira (`StaggeredSection` pula o stagger inicial de montagem no Android quando `triggerKey === undefined`).

---

## 5. Shaders Skia (`@shopify/react-native-skia`) e `useFrameCallback`

### O que causava travamento no app
1. **Shader calculando ruído pesado na tela inteira (`apple-intelligence/conf.ts`):**
   - O efeito "Pergunte ao ViKash" usa um `<Canvas>` Skia em tela cheia (~2,5 milhões de pixels por frame em telas FHD+).
   - O fragment shader original calculava Simplex Noise 3D (`snoise3` com 4 hashes e 8 produtos escalares), `atan()`, `pow(..., 8.0)`, `sampleGradient()` e `boxSDF` para **100% dos pixels da tela**, inclusive nos **~85% de pixels centrais** onde a borda arco-íris tem opacidade zero (`alpha == 0`).
2. **Loop de 120 FPS sem necessidade (`use-siri-uniforms.ts`):**
   - `useFrameCallback` atualizava `iTime.value` a cada 8ms em telas de 120Hz, reconstruindo o objeto `uniforms` (26 propriedades) e redesenhando a tela inteira 120 vezes por segundo para um brilho ambiente lento (`uGlowSpeed = 0.16`).
3. **Cantos desperdiçados no shader da esfera (`src/utils/orbShader.js`):**
   - O `<Canvas>` quadrado da esfera calculava `sqrt`, `pow`, `atan`, `sin` e `cos` mesmo nos pixels dos 4 cantos fora do raio do halo (`dot(q, q) >= 0.9216`).

### Regra obrigatória para Shaders SkSL
- **SEMPRE** faça *early-culling* (descarte matemático antecipado) no fragment shader antes de funções caras (`snoise3`, `atan`, `acos`, `pow`, `sin`, `cos`):
  - Em `conf.ts`, só calcule `snoise3` se `dist + 0.5 * uNoiseStrength > uMargin / uRadius`, e retorne `foreground` imediatamente se `bgMask <= 0.0001`.
  - Em `orbShader.js`, retorne `half4(0.0)` imediatamente se `dot(q, q) >= 0.9216`.
- **SEMPRE** limite a taxa de atualização de uniformes contínuos em `useFrameCallback` no Android (~30 FPS após o término da transição de abertura) quando a animação for apenas ambiental.
- **SEMPRE** pause animações Skia e Reanimated quando `AppState` sair de `'active'` ou quando o modal/componente estiver invisível.

---

## 6. Abertura de Modais e Drawers Pesados (`VoiceDrawer.jsx` & `AssistantExperience.jsx`)

### O que causava travamento no app
1. **Disparo de `withTiming` redundantes no primeiro render (`VoiceModeFade.jsx` & `VoiceComposer.jsx`):**
   - Ao montar o `VoiceDrawer`, 6 instâncias de `VoiceModeFade` e 2 efeitos em `VoiceComposer` chamavam `withTiming` no `useEffect` inicial mesmo quando `progress` já havia sido inicializado com o valor alvo (`visible ? 1 : 0`). Isso criava 8 animações de worklet concorrendo com a subida do `DrawerPanel`.
2. **Duplicação de `<AmbientLight />` dentro de modais no Android:**
   - Renderizar `<AmbientLight />` dentro do `VoiceDrawer` adicionava 4 `<Image>` full-screen com `tintColor` e 2 animações infinitas por baixo do `<Canvas>` Skia da esfera.
3. **Montagem simultânea de Input + Ícones + Captura no Frame 0 do Morph (`AssistantExperience.jsx`):**
   - Montar `TextInput` nativo, dezenas de nós SVG e iniciar captura de tela no exato milissegundo em que o `<Modal>` abre trava o primeiro frame da animação.

### Regra obrigatória
- **NUNCA** dispare `withTiming` / `withSpring` dentro de `useEffect` na primeira montagem se o `useSharedValue` já foi inicializado no estado alvo (use um `useRef` para comparar se a prop realmente mudou).
- **NUNCA** renderize `<AmbientLight />` extra dentro de modais/drawers no Android (`{Platform.OS !== 'android' && <AmbientLight />}`).
- **SEMPRE** preserve o carregamento diferido (`deferPanel` em `AssistantExperience.jsx`) ao animar aberturas de modais complexos no Android.

---

## 7. Armadilhas Específicas do Reanimated 4 neste Projeto

1. **`Easing` em `withTiming` vs. `cubicBezier` em CSS Animations:**
   - No Reanimated 4, `cubicBezier(x1, y1, x2, y2)` importado de `react-native-reanimated` serve **apenas** para animações CSS declarativas (`animationTimingFunction`).
   - Passar `cubicBezier(...)` para `withTiming(val, { easing })` lança erro fatal em runtime no Android/iOS:
     `[Reanimated] The easing function is not a worklet. Please make sure you import Easing from react-native-reanimated.`
   - Para `withTiming`, **SEMPRE** use `Easing.out(Easing.cubic)` ou `Easing.bezier(...)` importado de `react-native-reanimated`.
2. **Compatibilidade com os Mocks do Jest (`jest.native-mocks.js`):**
   - Prefira aritmética linear direta dentro de `useAnimatedStyle` (ex.: `1 + (scaleActive - 1) * progress.get()`) em vez de depender de helpers extras que possam não estar mockados nos testes unitários.
   - Quando ocultar valores financeiros (`hidden = true` / modo olho fechado), **desmonte** o nó `<Text>` com o valor real (`{hidden ? hiddenContent : visibleContent}`) em vez de apenas deixá-lo com `opacity: 0`, garantindo privacidade na árvore de acessibilidade e nos testes automatizados.

---

## Checklist Rápido antes de qualquer PR / Alteração por IA

- [ ] A nova tela ou card usa cores opacas no Android (`renderingEffects.cardTransparency === false`)?
- [ ] Nenhuma animação altera `width`, `height`, `top`, `left` ou `flex` por frame em listas ou barras de progresso?
- [ ] `renderToHardwareTextureAndroid` **não** foi colocado permanentemente em um container pai que tem filhos animados ou `ScrollView`?
- [ ] Os `useEffect` de animação ignoram o primeiro render se o `useSharedValue` já começa no valor final?
- [ ] Todo `withTiming` usa `Easing` (worklet) de `react-native-reanimated` e nunca `cubicBezier`?
- [ ] Se houver shader SkSL, os pixels fora da área visível sofrem `return` antecipado antes de cálculos trigonométricos ou de ruído?
- [ ] A suíte de testes (`rtk npm test -- --watchAll=false`) continua 100% verde?
