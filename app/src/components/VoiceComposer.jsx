import React, { useEffect, useRef } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import useComposerMetrics from '../hooks/useComposerMetrics';
import { voiceOrb } from '../theme/silver';
import VoiceComposerLayout from './VoiceComposerLayout';
const config = {
  duration: voiceOrb.composer.duration,
  easing: Easing.bezier(0.23, 1, 0.32, 1),
  reduceMotion: ReduceMotion.Never,
};
export default function VoiceComposer(props) {
  const { expanded, visible, onExpanded, keyboardDocked = false } = props;
  const metrics = useComposerMetrics(expanded, props.value);
  const progress = useSharedValue(expanded ? 1 : 0);
  const targetHeight = expanded ? metrics.expandedHeight : 44;
  const height = useSharedValue(targetHeight);
  const docked = useSharedValue(keyboardDocked ? 1 : 0);
  useEffect(() => {
    docked.set(withTiming(keyboardDocked ? 1 : 0, { ...config, duration: 250 }));
    return () => cancelAnimation(docked);
  }, [docked, keyboardDocked]);
  const footerStyle = useAnimatedStyle(() => ({ paddingBottom: 6 * (1 - docked.get()) }));
  const captionsStyle = useAnimatedStyle(() => ({ height: 36 * (1 - docked.get()), marginTop: 4 * (1 - docked.get()), opacity: 1 - docked.get() }));
  const prevExpanded = useRef(expanded);
  const prevHeight = useRef(targetHeight);
  useEffect(() => {
    if (!visible) {
      cancelAnimation(progress);
      prevExpanded.current = expanded;
      return undefined;
    }
    if (prevExpanded.current === expanded) {
      return undefined;
    }
    prevExpanded.current = expanded;
    progress.set(
      withTiming(expanded ? 1 : 0, config, finished => {
        if (finished && expanded && onExpanded) {
          scheduleOnRN(onExpanded);
        }
      }),
    );
    return () => cancelAnimation(progress);
  }, [expanded, visible, onExpanded, progress]);
  useEffect(() => {
    if (prevHeight.current === targetHeight) {
      return undefined;
    }
    prevHeight.current = targetHeight;
    height.set(withTiming(targetHeight, config));
    return () => cancelAnimation(height);
  }, [targetHeight, height]);
  const shellStyle = useAnimatedStyle(() => {
    const p = progress.get();
    const width = 44 + (metrics.width - 44) * p;
    return {
      width,
      height: height.get(),
      left: (metrics.width - width) / 2,
      transform: [{ translateY: -voiceOrb.composer.lift * p }],
    };
  }, [metrics.width]);
  const controlsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (height.get() + 26) * progress.get() }],
  }));
  const microphoneStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - 44 / 72) * progress.get() }],
  }));
  const sideControlsStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [{ scale: 1 - 0.35 * progress.get() }],
  }));
  const stageStyle = useAnimatedStyle(() => ({
    height: Math.max(
      voiceOrb.composer.stageHeight * (1 - docked.get()),
      (height.get() + 84) * progress.get(),
    ),
  }));
  const editorStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, (progress.get() - 0.28) / 0.72),
    transform: [{ translateX: 8 * (1 - progress.get()) }],
  }));
  const sendStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, (progress.get() - 0.55) / 0.45),
  }));
  const voiceCaptionStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
  }));
  const textCaptionStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
  }));
  return (
    <VoiceComposerLayout
      {...props}
      Box={Animated.View}
      metrics={metrics}
      shellStyle={shellStyle}
      controlsStyle={controlsStyle}
      microphoneStyle={microphoneStyle}
      sideControlsStyle={sideControlsStyle}
      stageStyle={stageStyle}
      footerStyle={footerStyle}
      captionsStyle={captionsStyle}
      editorStyle={editorStyle}
      sendStyle={sendStyle}
      voiceCaptionStyle={voiceCaptionStyle}
      textCaptionStyle={textCaptionStyle}
    />
  );
}
