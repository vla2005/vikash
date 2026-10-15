// Reacticx Animated Input Bar, adaptado para o ViKash.
// Mantém entrada/saída escalonada por caractere na UI thread, sem BlurView.
import React, { forwardRef, memo } from 'react';
import { Text, TextInput } from 'react-native';
import Animated, {
  ReduceMotion,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { InputBar } from './shared';
import type { IAnimatedInput, ICharacter } from './types';
const AnimatedText = Animated.createAnimatedComponent(Text);
const Character = memo(function InputCharacter({
  char,
  index,
  enterDuration,
  exitDuration,
  delayIncrement,
  style,
}: ICharacter) {
  const delay = index * delayIncrement;
  const entering = () => {
    'worklet';
    const spring = {
      damping: 18,
      stiffness: 180,
      mass: 0.8,
      reduceMotion: ReduceMotion.Never,
    };
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateY: 10 }, { scale: 0.85 }],
      },
      animations: {
        opacity: withDelay(
          delay,
          withTiming(1, {
            duration: enterDuration,
            reduceMotion: ReduceMotion.Never,
          }),
        ),
        transform: [
          { translateY: withDelay(delay, withSpring(0, spring)) },
          { scale: withDelay(delay, withSpring(1, spring)) },
        ],
      },
    };
  };
  const exiting = () => {
    'worklet';
    const timing = { duration: exitDuration, reduceMotion: ReduceMotion.Never };
    return {
      initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
      animations: {
        opacity: withDelay(delay, withTiming(0, timing)),
        transform: [{ translateY: withDelay(delay, withTiming(-4, timing)) }],
      },
    };
  };
  return (
    <AnimatedText entering={entering} exiting={exiting} style={style}>
      {char}
    </AnimatedText>
  );
});
export default memo(
  forwardRef<TextInput, IAnimatedInput>(function AnimatedInputBar(props, ref) {
    return <InputBar {...props} Character={Character} inputRef={ref} />;
  }),
);
