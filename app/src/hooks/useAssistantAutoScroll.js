import { useCallback, useEffect, useRef } from 'react';

// Follow growing text at most ten times/second, without competing animated scrolls.
// Scrolling up releases the anchor until the reader returns near the end.
export default function useAssistantAutoScroll(
  list,
  active,
  conversationId,
  userMessageId,
) {
  const following = useRef(true);
  const offset = useRef(0);
  const timer = useRef(null);
  const onContentSizeChange = useCallback(() => {
    if (!active || !following.current || timer.current !== null) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (following.current) list.current?.scrollToEnd({ animated: false });
    }, 100);
  }, [list, active]);
  const onScroll = useCallback(({ nativeEvent: event }) => {
    const y = Math.max(0, event.contentOffset.y);
    const nearEnd =
      event.contentSize.height - event.layoutMeasurement.height - y < 72;
    if (nearEnd) following.current = true;
    else if (y < offset.current - 3) following.current = false;
    offset.current = y;
  }, []);
  useEffect(() => {
    following.current = true;
    offset.current = 0;
    onContentSizeChange();
    return () => {
      clearTimeout(timer.current);
      timer.current = null;
    };
  }, [active, conversationId, userMessageId, onContentSizeChange]);
  return { onContentSizeChange, onScroll, scrollEventThrottle: 80 };
}
