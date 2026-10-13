import { pointerEventsStyles } from '../theme/interaction';
import React, { memo, useId } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import VoiceMicGlyph from './VoiceMicGlyph';
import VoiceMicPulse from './VoiceMicPulse';
import { voiceOrb as defaultVoiceOrb } from '../theme/silver';
import { useThemeTokens } from '../contexts/ThemeContext';

export default memo(function VoiceMicButton({
  active,
  review,
  disabled,
  label,
  onPress,
}) {
  const { voiceOrb } = useThemeTokens();
  const id = `voice-control-${useId().replace(/:/g, '')}`;
  return (
    <View style={s.shell}>
      <VoiceMicPulse active={active} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, busy: disabled, selected: active }}
        disabled={disabled}
        onPress={onPress}
        pressRetentionOffset={16}
        style={({ pressed }) => [
          s.button,
          pressed && s.pressed,
          disabled && s.disabled,
        ]}
      >
        <Svg
          style={[StyleSheet.absoluteFill, pointerEventsStyles.none]}
          width={voiceOrb.control.size}
          height={voiceOrb.control.size}
        >
          <Defs>
            <LinearGradient id={id} x1="15%" y1="0%" x2="80%" y2="100%">
              <Stop offset="0" stopColor={voiceOrb.control.fillTop} />
              <Stop offset="1" stopColor={voiceOrb.control.fillBottom} />
            </LinearGradient>
            <RadialGradient id={`${id}-shine`} cx="25%" cy="10%" r="85%">
              <Stop
                offset="0"
                stopColor={voiceOrb.highlight}
                stopOpacity="0.8"
              />
              <Stop
                offset="0.5"
                stopColor={voiceOrb.highlight}
                stopOpacity="0.15"
              />
              <Stop offset="1" stopColor={voiceOrb.highlight} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle
            cx="36"
            cy="36"
            r="35"
            fill={`url(#${id})`}
            stroke={voiceOrb.control.rim}
            strokeWidth="1"
          />
          {active && (
            <Circle cx="36" cy="36" r="35" fill={`url(#${id}-shine)`} />
          )}
        </Svg>
        <View style={[s.glyph, pointerEventsStyles.none]}>
          <VoiceMicGlyph review={review} />
        </View>
      </Pressable>
    </View>
  );
});
const s = StyleSheet.create({
  shell: {
    width: defaultVoiceOrb.control.size,
    height: defaultVoiceOrb.control.size,
  },
  glyph: { position: 'relative', zIndex: 1 },
  button: {
    flex: 1,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.45 },
});
