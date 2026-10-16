import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, cancelAnimation, ReduceMotion } from 'react-native-reanimated';
import AssistantIntroLayout from './AssistantIntroLayout';
import { assistantMotion } from '../../utils/assistantMotion';
const AnimatedText = Animated.createAnimatedComponent(Text);
export default function AssistantIntro({ compact }) {
  const progress = useSharedValue(compact ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(compact ? 1 : 0,{duration:assistantMotion.compactDuration,reduceMotion:ReduceMotion.Never}));
    return () => cancelAnimation(progress);
  },[compact,progress]);
  const frame = useAnimatedStyle(() => ({paddingBottom:30-20*progress.get()}));
  const copy = useAnimatedStyle(() => ({gap:12-6*progress.get()}));
  const icon = useAnimatedStyle(() => ({height:30-6*progress.get(),transform:[{scale:1-0.2*progress.get()}]}));
  const title = useAnimatedStyle(() => ({fontSize:27-5*progress.get(),lineHeight:36-7*progress.get()}));
  const caption = useAnimatedStyle(() => ({fontSize:14-2*progress.get(),lineHeight:22-4*progress.get()}));
  return <AssistantIntroLayout Box={Animated.View} Copy={Animated.View} Label={AnimatedText} frameStyle={frame} copyStyle={copy} iconStyle={icon} titleStyle={title} captionStyle={caption} />;
}
