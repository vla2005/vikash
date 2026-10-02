import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function BrandWatermark() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 290" preserveAspectRatio="xMidYMax slice" accessible={false}>
      <Path d="M40 58L157 246L244 86L299 178L360 110" stroke="#244DE8" strokeWidth="62" strokeLinecap="round" strokeLinejoin="round" opacity="0.075" fill="none" />
    </Svg>
  );
}
