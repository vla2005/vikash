import React, { useLayoutEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, cancelAnimation, Easing, ReduceMotion } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import DockAssistantContent, { assistantDockContentStyle } from '../silver/DockAssistantContent';
import AssistantReturnSurface from './AssistantReturnSurface';
import { useThemeTokens } from '../../contexts/ThemeContext';
import { assistantMotion } from '../../utils/assistantMotion';
export default function AssistantDockMotion({ children, backdrop, transition, opening, closing, onFinished, onOpened, onDockCovered, flightRef }) {
  const progress = useSharedValue(0);
  const entering = transition?.direction === 'open';
  const done = useRef(null); done.current = {open:onOpened,close:onFinished};
  const { dock } = useThemeTokens();
  const finish = React.useCallback(isOpening => done.current?.[isOpening ? 'open' : 'close']?.(), []);
  useLayoutEffect(() => {
    if (!transition) return;
    progress.set(withTiming(entering ? 1 : 0, { duration:entering ? assistantMotion.openDuration : assistantMotion.closeDuration, easing:Easing.bezier(0.65,0,0.35,1), reduceMotion:ReduceMotion.Never }, finished => {
      if (finished) scheduleOnRN(finish,entering);
    }));
    return () => cancelAnimation(progress);
  }, [transition,entering,progress,finish]);
  const from = transition?.from || {x:0,y:0,width:1,height:1};
  const to = transition?.to || from;
  const backgroundStyle = useAnimatedStyle(() => ({ opacity:transition ? progress.get() : opening ? 0 : 1 }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity:transition ? Math.max(0,(progress.get()-0.5)*2) : opening ? 0 : 1 }));
  const flightStyle = useAnimatedStyle(() => {
    const p = entering ? progress.get() : 1-progress.get();
    return { left:from.x, top:from.y, width:from.width+(to.width-from.width)*p,
      height:from.height+(to.height-from.height)*p, borderRadius:entering ? from.height/2+(28-from.height/2)*p : 28+(to.height/2-28)*p,
      opacity:Math.min(1,(1-progress.get())*4), transform:[{translateX:(to.x-from.x)*p},{translateY:(to.y-from.y)*p}] };
  });
  const labelStyle = useAnimatedStyle(() => ({ opacity:Math.max(0,1-progress.get()*2) }));
  return <>
    <Animated.View style={[StyleSheet.absoluteFill,styles.passive,backgroundStyle]}>{backdrop}</Animated.View>
    <Animated.View testID="assistant-morph-content" style={[StyleSheet.absoluteFill,bodyStyle,(closing || opening) && styles.passive]}>{children}</Animated.View>
    {transition && <Animated.View key={entering ? "open" : "close"} ref={flightRef} onLayout={entering ? onDockCovered : undefined} collapsable={false} testID={entering ? "assistant-open-flight" : "assistant-return-flight"} accessible={false} accessibilityElementsHidden
      style={[styles.flight,{borderColor:dock.rim},flightStyle]}>
      <AssistantReturnSurface><Animated.View style={[assistantDockContentStyle,labelStyle]}><DockAssistantContent /></Animated.View></AssistantReturnSurface>
    </Animated.View>}
  </>;
}
const styles = StyleSheet.create({ passive:{ pointerEvents:'none' },flight:{ position:'absolute',zIndex:200,overflow:'hidden',borderWidth:1,pointerEvents:'none' } });
