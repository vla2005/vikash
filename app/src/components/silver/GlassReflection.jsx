import { pointerEventsStyles } from '../../theme/interaction';
import React, { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export default memo(function GlassReflection() {
  const id = useId().replace(/:/g, '');
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, pointerEventsStyles.none]}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity="0.035" />
            <Stop offset="0.5" stopColor="white" stopOpacity="0.008" />
            <Stop offset="1" stopColor="white" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});
