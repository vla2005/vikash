import React, { useRef } from 'react';
import { EntryLayout, useEntryLayout } from './AssistantEntryLayout.shared';
import { assistantMotion } from '../../utils/assistantMotion';
export default function AssistantEntryLayout({focused,opening,closing,...props}) {
  const model=useEntryLayout(focused), last=useRef(model.target);
  if (!closing) last.current=model.target;
  const style={top:last.current,transitionProperty:'top',transitionDuration:opening ? '0ms' : `${assistantMotion.compactDuration}ms`,transitionTimingFunction:'cubic-bezier(.22,1,.36,1)'};
  return <EntryLayout {...props} model={model} fieldStyle={style} />;
}
