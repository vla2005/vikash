import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { voiceOrb } from '../theme/silver';
const geometry = voiceOrb.composer;
export default function useComposerMetrics(expanded, value) {
  const { width: windowWidth } = useWindowDimensions();
  const [width, setWidth] = useState(
    Math.max(44, Math.min(windowWidth, 460) - 48),
  );
  const [textHeight, setTextHeight] = useState(24);
  useEffect(() => {
    if (!value) {
      setTextHeight(24);
    }
  }, [value]);
  const opened = useRef(expanded);
  if (expanded) {
    opened.current = true;
  }
  return {
    width,
    textHeight,
    expandedHeight: Math.min(
      geometry.maxHeight,
      Math.max(
        geometry.expandedHeight,
        value ? textHeight + 40 : geometry.expandedHeight,
      ),
    ),
    opened: opened.current,
    onLayout: event => {
      const next = Math.max(44, Math.round(event.nativeEvent.layout.width));
      setWidth(previous => (previous === next ? previous : next));
    },
    onContentSizeChange: event => {
      const next = Math.max(
        24,
        Math.min(88, Math.ceil(event.nativeEvent.contentSize.height)),
      );
      setTextHeight(previous => (previous === next ? previous : next));
    },
  };
}
