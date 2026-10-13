import React, { memo, useId } from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useThemeTokens } from '../contexts/ThemeContext';

export default memo(function VoiceMicGlow() {
  const { voiceOrb } = useThemeTokens();
  const id = `voice-glow-${useId().replace(/:/g, '')}`;
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <RadialGradient id={id}>
          <Stop
            offset="0"
            stopColor={voiceOrb.control.glow}
            stopOpacity="0.8"
          />
          <Stop
            offset="0.4"
            stopColor={voiceOrb.control.glow}
            stopOpacity="0.48"
          />
          <Stop
            offset="0.72"
            stopColor={voiceOrb.control.glow}
            stopOpacity="0.13"
          />
          <Stop offset="1" stopColor={voiceOrb.control.glow} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50%" cy="50%" r="50%" fill={`url(#${id})`} />
    </Svg>
  );
});
