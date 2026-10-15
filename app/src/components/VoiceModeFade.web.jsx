import React from 'react';
import { View } from 'react-native';
import { voiceOrb } from '../theme/silver';
import { pointerEventsStyles } from '../theme/interaction';
export default function VoiceModeFade({
  visible,
  minOpacity = 0,
  interactive = false,
  style,
  children,
}) {
  const hidden = !visible && minOpacity === 0;
  const motionStyle = {
    opacity: visible ? 1 : minOpacity,
    transitionProperty: 'opacity',
    transitionDuration: `${voiceOrb.composer.duration}ms`,
    transitionTimingFunction: 'cubic-bezier(.23,1,.32,1)',
  };
  return (
    <View
      accessibilityElementsHidden={hidden}
      aria-hidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      style={[
        style,
        motionStyle,
        pointerEventsStyles[visible && interactive ? 'auto' : 'none'],
      ]}
    >
      {children}
    </View>
  );
}
