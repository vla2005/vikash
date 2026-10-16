import React, { useLayoutEffect } from 'react';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { EntryLayout, useEntryLayout } from './AssistantEntryLayout.shared';
import { assistantMotion } from '../../utils/assistantMotion';
export default function AssistantEntryLayout({focused,opening,closing,...props}) {
  const model=useEntryLayout(focused);
  const top=useSharedValue(model.target);
  useLayoutEffect(() => {
    if (closing) {cancelAnimation(top);return;}
    top.set(opening ? model.target : withTiming(model.target,{duration:assistantMotion.compactDuration,reduceMotion:ReduceMotion.Never}));
    return () => cancelAnimation(top);
  },[model.target,opening,closing,top]);
  const style=useAnimatedStyle(() => ({top:0,transform:[{translateY:top.get()}]}));
  return <EntryLayout {...props} model={model} Box={Animated.View} fieldStyle={opening ? {top:model.target} : style} />;
}
