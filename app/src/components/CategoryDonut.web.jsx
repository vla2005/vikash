import React, { useId, useMemo } from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, Defs, G, Mask } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import useReducedMotion from '../hooks/useReducedMotion';
import { ChartDrawCircle, useChartProgress } from './ChartMotion';
const radius = 76;
const circumference = 2 * Math.PI * radius;
export default function Donut({ slices, hidden, periodLabel }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const maskId = `expenses${useId().replace(/:/g, '')}`;
  const resetKey = useMemo(() => ({ slices, periodLabel }), [slices, periodLabel]);
  const progress = useChartProgress(!hidden && !reduced && !!slices.length, resetKey);
  let offset = 0;
  return <Svg width="100%" height="100%" viewBox="0 0 200 200" accessible={Platform.OS === 'web' ? undefined : false} aria-hidden={Platform.OS === 'web' || undefined}>
    <Circle cx={100} cy={100} r={radius} fill="none" stroke={colors.border} strokeWidth={22} />
    {!hidden && <><Defs><Mask id={maskId} x="0" y="0" width="200" height="200" maskUnits="userSpaceOnUse">
      <ChartDrawCircle progress={progress} length={circumference} cx={100} cy={100} r={radius} fill="none" stroke="white" strokeWidth={26}
        rotation={-90} origin="100, 100" strokeDasharray={[circumference, circumference]}
        />
    </Mask></Defs><G mask={`url(#${maskId})`}>
      {slices.map(slice => {
        const length = slice.fraction * circumference;
        const gap = slices.length === 1 ? 0 : Math.min(4, length * 0.15);
        const start = offset;
        offset += length;
        return <Circle key={slice.key} cx={100} cy={100} r={radius} fill="none" stroke={slice.color} strokeWidth={22}
          rotation={-90} origin="100, 100" strokeDasharray={[Math.max(0, length - gap), circumference]}
          strokeDashoffset={-start} strokeLinecap="butt" />;
      })}
    </G></>}
  </Svg>;
}

