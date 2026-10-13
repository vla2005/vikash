import { pointerEventsStyles } from '../theme/interaction';
import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { useThemeTokens } from '../contexts/ThemeContext';

// O desenho é o mesmo nas três plataformas; só o motor da malha muda.
export default function ListeningOrbSurface({
  active,
  size,
  PathComponent = Path,
  frontProps,
  backProps,
}) {
  const { voiceOrb } = useThemeTokens();
  const id = `voice-${useId().replace(/:/g, '')}`;
  return (
    <View
      testID="listening-orb"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[[
        styles.orb,
        { width: size, height: size },
        !active && styles.idle,
      ], pointerEventsStyles.none]}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id={`${id}-halo`}>
            <Stop
              offset="0"
              stopColor={voiceOrb.glow}
              stopOpacity={voiceOrb.haloOpacity}
            />
            <Stop
              offset="0.48"
              stopColor={voiceOrb.glow}
              stopOpacity={voiceOrb.haloOpacity * 0.5}
            />
            <Stop offset="1" stopColor={voiceOrb.glow} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={`${id}-wire`} x1="12%" y1="8%" x2="84%" y2="100%">
            <Stop offset="0" stopColor={voiceOrb.highlight} />
            <Stop offset="0.44" stopColor={voiceOrb.wire} />
            <Stop offset="0.75" stopColor={voiceOrb.highlight} />
            <Stop offset="1" stopColor={voiceOrb.shadow} />
          </LinearGradient>
        </Defs>
        <Circle cx="100" cy="100" r="96" fill={`url(#${id}-halo)`} />
        <PathComponent
          {...backProps}
          fill="none"
          stroke={voiceOrb.wire}
          strokeOpacity={voiceOrb.backOpacity}
          strokeWidth="0.6"
        />
        <PathComponent
          {...frontProps}
          fill="none"
          stroke={`url(#${id}-wire)`}
          strokeOpacity={voiceOrb.frontOpacity}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
const styles = StyleSheet.create({
  orb: { alignItems: 'center', justifyContent: 'center' },
  idle: { opacity: 0.5 },
});
