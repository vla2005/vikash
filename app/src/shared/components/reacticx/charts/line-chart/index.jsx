import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { fontFamily } from '../../../../../theme';

const width = 320;
const height = 172;
const padding = 12;
const grid = [padding, height / 2, height - padding]
  .map(y => `M ${padding} ${y} H ${width - padding}`).join(' ');
const monthIndex = label => Number(label.slice(0, 4)) * 12 + Number(label.slice(5, 7));
const monthLabel = label => `${label.slice(5, 7)}/${label.slice(0, 4)}`;

// Adapted from Reacticx Line Chart's toPixelPoints and buildLinePath (linear curve).
// SVG keeps the same plot on Expo native and web. Selection lives in the chart legend.
export default memo(function LineChart({ data, selectedIndex, color }) {
  const points = useMemo(() => {
    const first = monthIndex(data[0].label);
    const spanX = monthIndex(data.at(-1).label) - first;
    const max = Math.max(...data.map(point => point.value));
    return data.map(({ label, value }) => ({
      x: padding + (monthIndex(label) - first) / spanX * (width - 2 * padding),
      y: padding + (1 - value / max) * (height - 2 * padding),
    }));
  }, [data]);
  const path = points.map(({ x, y }, index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');

  return (
    <View aria-hidden style={s.root}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Path d={grid} stroke="#29292D" strokeWidth={1} />
        <Path testID="line-chart-series" d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {points.map(({ x, y }, index) => (
          <Circle key={data[index].label} cx={x} cy={y} r={index === selectedIndex ? 6 : 3}
            fill={index === selectedIndex ? '#FFFFFF' : color}
            testID={index === selectedIndex ? 'line-chart-selected-point' : undefined} />
        ))}
      </Svg>
      <View style={s.labels}>
        <Text style={s.label}>{monthLabel(data[0].label)}</Text>
        <Text style={s.label}>{monthLabel(data.at(-1).label)}</Text>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  root: { width: '100%', gap: 3 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: padding },
  label: { fontFamily, fontSize: 11, color: '#B0B0B4' },
});
