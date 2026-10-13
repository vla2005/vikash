// CSS e Animated web seguem a política compartilhada, sem consultar matchMedia.
// Evita carregar o motor nativo do Reanimated no bundle Vite.
export default function AppMotionPolicy() {
  return null;
}
