import React, { useRef } from 'react';
import { View } from 'react-native';
const baseMotion = { animationName:'vikash-assistant-enter', animationTimingFunction:'cubic-bezier(.22,1,.36,1)' };
const motionTiming = { chat:{ animationDuration:'300ms' }, compose:{ animationDuration:'460ms' } };
export default function AssistantMotion({ children, style, chat }) {
  const previous = useRef(chat), changed = useRef(false);
  if (previous.current !== chat) { previous.current=chat; changed.current=true; }
  return <>
    <style>{'@keyframes vikash-assistant-enter { from { opacity:0; transform:translateY(26px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }'}</style>
    <View key={String(chat)} style={[style, changed.current && baseMotion, changed.current && motionTiming[chat ? 'chat' : 'compose']]}>{children}</View>
  </>;
}
