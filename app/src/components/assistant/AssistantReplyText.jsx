import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import useAppActive from '../../hooks/useAppActive';
import { fontFamily, fontFamilyBold } from '../../theme';
import {
  REPLY_TICK_MS,
  replyRevealBoundaries,
  replyRevealOffset,
  replyRevealTiming,
} from '../../utils/assistantReplyMotion';

const FinancialText = memo(function FinancialText({
  content,
  writing = false,
}) {
  return (
    <View
      testID="assistant-reply-text"
      accessible={writing || undefined}
      accessibilityLabel={
        writing ? 'ViKash está escrevendo a resposta' : undefined
      }
      accessibilityState={writing ? { busy: true } : undefined}
      style={s.prose}
    >
      {content
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((paragraph, index) => (
          <Text key={index} selectable={!writing} style={s.text}>
            {paragraph.split(/(R\$\s?-?[\d.,]+)/g).map((part, i) => (
              <Text
                key={i}
                style={part.startsWith('R$') ? s.emphasis : undefined}
              >
                {part}
              </Text>
            ))}
          </Text>
        ))}
    </View>
  );
});

function RevealingText({ content, active, messageId, onComplete }) {
  const running = useAppActive(active);
  const boundaries = useMemo(() => replyRevealBoundaries(content), [content]);
  const [offset, setOffset] = useState(() => replyRevealOffset(boundaries, 0));
  const completed = useRef(false);
  const onDone = useRef(onComplete);
  onDone.current = onComplete;
  useEffect(() => {
    if (completed.current) return;
    const finish = () => {
      completed.current = true;
      setOffset(content.length);
      onDone.current?.(messageId);
    };
    if (!running || !content) {
      finish();
      return;
    }
    const { duration } = replyRevealTiming(content);
    const started = Date.now();
    let timer;
    const tick = () => {
      const progress = Math.min(1, (Date.now() - started) / duration);
      if (progress >= 1) {
        finish();
        return;
      }
      setOffset(replyRevealOffset(boundaries, progress));
      timer = setTimeout(tick, REPLY_TICK_MS);
    };
    timer = setTimeout(tick, REPLY_TICK_MS);
    return () => clearTimeout(timer);
  }, [running, content, boundaries, messageId]);
  return (
    <FinancialText
      content={content.slice(0, offset)}
      writing={offset < content.length}
    />
  );
}

export default memo(function AssistantReplyText({
  content,
  animate = false,
  active = true,
  messageId,
  onComplete,
}) {
  return animate ? (
    <RevealingText
      key={messageId || content}
      content={content}
      active={active}
      messageId={messageId}
      onComplete={onComplete}
    />
  ) : (
    <FinancialText content={content} />
  );
});
const s = StyleSheet.create({
  prose: { gap: 18 },
  text: { fontFamily, fontSize: 16, lineHeight: 27, color: '#F4F4F3' },
  emphasis: { fontWeight: '700', fontFamily: fontFamilyBold, color: '#FFFFFF' },
});
