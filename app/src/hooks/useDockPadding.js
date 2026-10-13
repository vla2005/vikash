import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useDock } from '../contexts/DockContext';
import { dock } from '../theme/silver';

// Reserva o espaço da barra expandida mesmo quando ela está compactada.
// Assim, a animação não muda a altura do conteúdo nem desloca a rolagem.
export default function useDockPadding(contentContainerStyle) {
  const context = useDock();
  const enabled = !!context;
  const bottom = context?.bottomInset || 0;
  const headerHeight = context?.headerHeight || 0;
  const style = StyleSheet.flatten(contentContainerStyle) || {};
  const top = style.paddingTop ?? style.paddingVertical ?? style.padding ?? 0;
  return useMemo(
    () =>
      enabled
        ? {
            // A reserva rola junto com o conteúdo, que pode passar sob o header.
            ...(headerHeight > 0 && { paddingTop: top + headerHeight }),
            paddingBottom:
              dock.height +
              dock.voiceHeight +
              dock.gap +
              Math.max(bottom, 12) +
              28,
          }
        : undefined,
    [enabled, bottom, headerHeight, top],
  );
}
