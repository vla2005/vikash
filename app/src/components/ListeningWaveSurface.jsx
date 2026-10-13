import { pointerEventsStyles } from '../theme/interaction';
import React, { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { voiceOrb as defaultVoiceOrb } from '../theme/silver';
import { useThemeTokens } from '../contexts/ThemeContext';

export default memo(function ListeningWaveSurface({
  active,
  compact,
  PathComponent = Path,
  strandsProps,
  ribsProps,
}) {
  const { voiceOrb } = useThemeTokens();
  const id = `voice-wave-${useId().replace(/:/g, '')}`;
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[[styles.frame, compact && styles.compact, !active && styles.idle], pointerEventsStyles.none]}
    >
      <Svg
        width="100%"
        height={compact ? voiceOrb.wave.compactHeight : voiceOrb.wave.height}
        viewBox="0 0 300 76"
      >
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0" stopColor={voiceOrb.wave.color} stopOpacity="0" />
            <Stop
              offset="0.2"
              stopColor={voiceOrb.wave.color}
              stopOpacity="0.65"
            />
            <Stop offset="0.5" stopColor={voiceOrb.highlight} stopOpacity="1" />
            <Stop
              offset="0.8"
              stopColor={voiceOrb.wave.color}
              stopOpacity="0.65"
            />
            <Stop offset="1" stopColor={voiceOrb.wave.color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <PathComponent
          {...ribsProps}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="0.8"
          opacity="0.3"
        />
        <PathComponent
          {...strandsProps}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.65"
        />
      </Svg>
    </View>
  );
});
const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 300,
    height: defaultVoiceOrb.wave.height,
    marginTop: 8,
  },
  idle: { opacity: 0.2 },
  compact: { height: defaultVoiceOrb.wave.compactHeight },
});
