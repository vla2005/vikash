import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import { cancelAnimation, Easing, ReduceMotion, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { createCompoundComponent } from '../../../utils/create-compound-component';
import { PieChartContext, usePieChart } from './context';
import { arcPath, lerp, sumValues, toRadians, toSlices } from './helper';
import { TAU, SLICE_COLORS } from './const';
import type { IPieChartRoot, IPieChartSlices, IPieChartArc } from './types';

// O dashboard não usa seleção por arraste. Sem GestureDetector nem biblioteca extra.
const PieChartRoot = memo(({ children, data, innerRadius = 65 / 87, padAngle = 3, animate = true, growDuration = 900, morphDuration = 450, style, trackColor = 'transparent' }: IPieChartRoot & { trackColor?: string }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const origin = useSharedValue<number[]>([]);
  const target = useSharedValue<number[]>([]);
  const morph = useSharedValue(1);
  const grow = useSharedValue(0);
  const isActive = useSharedValue(0);
  const selectedIndex = useSharedValue(-1);
  const entered = useRef(false);
  const measure = useCallback(({ nativeEvent: { layout } }: LayoutChangeEvent) => setSize(old => old.width === layout.width && old.height === layout.height ? old : { width: layout.width, height: layout.height }), []);
  const slices = useMemo(() => toSlices(data), [data]);
  const radius = Math.min(size.width, size.height) * 0.435;
  const inner = radius * innerRadius;
  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const measured = radius > 0;
  useEffect(() => {
    if (!measured || !slices.length) { return; }
    const fractions = slices.map(slice => slice.fraction);
    cancelAnimation(morph);
    cancelAnimation(grow);
    if (!animate) { origin.set(fractions); target.set(fractions); morph.set(1); grow.set(1); }
    else if (!entered.current || grow.get() < 1 || target.get().length !== fractions.length) {
      origin.set(fractions); target.set(fractions); morph.set(1); grow.set(0);
      grow.set(withTiming(1, { duration: growDuration, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never }));
    } else {
      const a = origin.get(), b = target.get(), p = morph.get();
      origin.set(fractions.map((_, i) => lerp(a[i] ?? 0, b[i] ?? 0, p)));
      target.set(fractions); morph.set(0);
      morph.set(withTiming(1, { duration: morphDuration, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.Never }));
    }
    entered.current = true;
    return () => { cancelAnimation(morph); cancelAnimation(grow); };
  }, [slices, measured, animate, growDuration, morphDuration, origin, target, morph, grow]);
  const pad = toRadians(padAngle);
  const arcs = useDerivedValue<IPieChartArc[]>(() => {
    const a = origin.get(), b = target.get(), limit = grow.get() * TAU;
    let cursor = 0;
    return b.map((fraction, i) => {
      const sweep = lerp(a[i] ?? 0, fraction, morph.get()) * TAU;
      const gap = b.length === 1 ? 0 : Math.min(pad, sweep * 0.15);
      const start = cursor + gap / 2, end = Math.max(start, Math.min(cursor + sweep - gap / 2, limit));
      cursor += sweep;
      return { start, end, mid: cursor - sweep / 2 };
    });
  }, [pad]);
  const context = useMemo(() => ({ data, slices, total: sumValues(data), width: size.width, height: size.height, centerX, centerY, radius, innerRadius: inner, activeOffset: 0, bottomInset: 0, arcs, grow, isActive, selectedIndex }), [data, slices, size, centerX, centerY, radius, inner, arcs, grow, isActive, selectedIndex]);
  const track = useMemo(() => arcPath(centerX, centerY, radius, inner, 0, TAU), [centerX, centerY, radius, inner]);
  return <View style={[styles.root, style]} onLayout={measure}><Canvas style={styles.fill}>{measured && <><Path path={track} color={trackColor} /><PieChartContext.Provider value={context}>{children}</PieChartContext.Provider></>}</Canvas></View>;
});
const Slice = memo(({ index, color }: { index: number; color: string }) => {
  const { arcs, centerX, centerY, radius, innerRadius } = usePieChart('Slices');
  const path = useDerivedValue(() => { const arc = arcs.get()[index]; return arc ? arcPath(centerX, centerY, radius, innerRadius, arc.start, arc.end) : 'M 0 0'; }, [index, centerX, centerY, radius, innerRadius]);
  return <Path path={path} color={color} />;
});
const PieChartSlices = memo(({ colors = SLICE_COLORS }: IPieChartSlices) => {
  const { data } = usePieChart('Slices');
  return <>{data.map((point, index) => <Slice key={point.label + index} index={index} color={point.color ?? colors[index % colors.length]!} />)}</>;
});
const styles = StyleSheet.create({ root: { width: '100%', height: '100%' }, fill: { flex: 1 } });
const Root = createCompoundComponent('PieChart.Root', PieChartRoot);
const Slices = createCompoundComponent('PieChart.Slices', PieChartSlices);
const PieChart = createCompoundComponent('PieChart', Root, { Root, Slices });
export { PieChart };
export default PieChart;
