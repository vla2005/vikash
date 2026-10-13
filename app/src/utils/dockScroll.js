import { dock } from '../theme/silver';

// Histerese: pequenas correções do dedo e o bounce não alternam a barra.
export function nextDockScroll(y, anchor, collapsed, maxScroll) {
  'worklet';
  const position = Math.max(0, Math.min(y, maxScroll));
  if (position <= 16 || maxScroll < dock.scrollStart) {
    return { anchor: position, collapsed: false };
  }
  if (
    !collapsed &&
    position > dock.scrollStart &&
    position - anchor > dock.scrollThreshold
  ) {
    return { anchor: position, collapsed: true };
  }
  if (collapsed && anchor - position > dock.scrollThreshold) {
    return { anchor: position, collapsed: false };
  }
  // A âncora segue a direção oposta para medir a distância desde a reversão.
  return {
    anchor: collapsed ? Math.max(anchor, position) : Math.min(anchor, position),
    collapsed,
  };
}
