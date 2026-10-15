import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import useComposerMetrics from '../hooks/useComposerMetrics';
import { voiceOrb } from '../theme/silver';
import VoiceComposerLayout from './VoiceComposerLayout';
const duration = `${voiceOrb.composer.duration}ms`;
const easing = 'cubic-bezier(.23,1,.32,1)';
const fade = {
  transitionProperty: 'opacity, transform',
  transitionDuration: duration,
  transitionTimingFunction: easing,
};
const resize = { ...fade, transitionProperty: 'height' };
export default function VoiceComposer(props) {
  const { expanded, visible, onExpanded } = props;
  const metrics = useComposerMetrics(expanded, props.value);
  const initiallyExpanded = useRef(expanded);
  const shellRef = useRef(null);
  const completion = useRef(null);
  completion.current = { expanded, visible, onExpanded };
  useEffect(() => {
    const node = shellRef.current;
    const complete = event => {
      const current = completion.current;
      if (
        event.target === node &&
        event.propertyName === 'width' &&
        current.expanded &&
        current.visible
      ) {
        current.onExpanded?.();
      }
    };
    node?.addEventListener?.('transitionend', complete);
    return () => node?.removeEventListener?.('transitionend', complete);
  }, []);
  useEffect(() => {
    if (initiallyExpanded.current && expanded && visible) {
      onExpanded?.();
    }
    initiallyExpanded.current = false;
  }, [expanded, visible, onExpanded]);
  const p = expanded ? 1 : 0;
  const width = expanded ? metrics.width : 44;
  const shellStyle = {
    width,
    height: expanded ? metrics.expandedHeight : 44,
    left: (metrics.width - width) / 2,
    transform: [{ translateY: -voiceOrb.composer.lift * p }],
    transitionProperty: 'width, height, left, transform',
    transitionDuration: duration,
    transitionTimingFunction: easing,
  };
  return (
    <VoiceComposerLayout
      {...props}
      Box={View}
      metrics={metrics}
      shellStyle={shellStyle}
      shellRef={shellRef}
      controlsStyle={{
        ...fade,
        transform: [{ translateY: (metrics.expandedHeight + 26) * p }],
      }}
      microphoneStyle={{
        ...fade,
        transform: [{ scale: 1 - (1 - 44 / 72) * p }],
      }}
      sideControlsStyle={{
        ...fade,
        opacity: 1 - p,
        transform: [{ scale: 1 - 0.35 * p }],
      }}
      stageStyle={{
        height: Math.max(
          voiceOrb.composer.stageHeight,
          expanded ? metrics.expandedHeight + 84 : 0,
        ),
        ...resize,
      }}
      editorStyle={{
        ...fade,
        opacity: p,
        transform: [{ translateX: 8 * (1 - p) }],
      }}
      sendStyle={{ ...fade, opacity: p }}
      voiceCaptionStyle={{ ...fade, opacity: 1 - p }}
      textCaptionStyle={{ ...fade, opacity: p }}
    />
  );
}
