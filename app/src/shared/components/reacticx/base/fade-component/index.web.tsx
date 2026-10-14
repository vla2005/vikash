import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { createCompoundComponent } from '../../../utils/create-compound-component';
import type { IFadeComponent, IFadeFromProps, IFadeToProps } from './types';
const Context = createContext<Animated.Value | null>(null);
function Root({ state = 'from', duration = 180, children, style, testID }: IFadeComponent) {
  const progress = useRef(new Animated.Value(state === 'to' ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: state === 'to' ? 1 : 0, duration, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [state, duration, progress]);
  return <Context.Provider value={progress}><View style={style} testID={testID}>{children}</View></Context.Provider>;
}
function From({ children, style, testID }: IFadeFromProps) {
  const progress = useContext(Context)!;
  return <Animated.View testID={testID} style={[StyleSheet.absoluteFill, styles.passThrough, style, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>{children}</Animated.View>;
}
function To({ children, style, testID }: IFadeToProps) {
  const progress = useContext(Context)!;
  return <Animated.View style={[style, { opacity: progress }]} testID={testID}>{children}</Animated.View>;
}
export const FadeComponent = createCompoundComponent('FadeComponent', Root, { From, To });

const styles = StyleSheet.create({ passThrough: { pointerEvents: 'none' } });
