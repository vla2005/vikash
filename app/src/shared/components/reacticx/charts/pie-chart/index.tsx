import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type GestureResponderEvent,
} from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { createCompoundComponent } from '../../../utils/create-compound-component';
import { PieChartContext, usePieChart } from './context';
import { arcPath, lerp, sumValues, toRadians, toSlices } from './helper';
import {
  TAU,
  ANGLE_ORIGIN,
  SLICE_COLORS,
  SPRING_CONFIG,
  GROW_DURATION,
  MORPH_DURATION,
} from './const';
import { hitSlice, makeArcs, plotGeometry, slicePath } from './interaction';
import type { IPieChartRoot, IPieChartSlices, IPieChartArc } from './types';

// Toque controlado pelo dashboard; mantém a mola/entrada do Reacticx sem instalar um detector de arraste.
const PieChartRoot = memo(
  ({
    children,
    data,
    innerRadius = 0.66,
    padAngle = 1.5,
    startAngle = 0,
    activeOffset = 10,
    selectedIndex: selection = -1,
    onSelectionChange,
    animate = true,
    growDuration = GROW_DURATION,
    morphDuration = MORPH_DURATION,
    style,
    trackColor = 'transparent',
  }: IPieChartRoot) => {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const origin = useSharedValue<number[]>([]);
    const target = useSharedValue<number[]>([]);
    const morph = useSharedValue(1);
    const grow = useSharedValue(0);
    const isActive = useSharedValue(0);
    const selectedIndex = useSharedValue(-1);
    const entered = useRef(false);
    const measure = useCallback(
      ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
        setSize(old =>
          old.width === layout.width && old.height === layout.height
            ? old
            : { width: layout.width, height: layout.height },
        ),
      [],
    );
    const slices = useMemo(() => toSlices(data), [data]);
    const geometry = useMemo(
      () => plotGeometry(size.width, size.height, innerRadius, activeOffset),
      [size, innerRadius, activeOffset],
    );
    const { radius, centerX, centerY, innerRadius: inner } = geometry;
    const measured = radius > 0;
    useEffect(() => {
      if (!measured || !slices.length) {
        return;
      }
      const fractions = slices.map(slice => slice.fraction);
      cancelAnimation(morph);
      cancelAnimation(grow);
      if (!animate) {
        origin.set(fractions);
        target.set(fractions);
        morph.set(1);
        grow.set(1);
      } else if (
        !entered.current ||
        grow.get() < 1 ||
        target.get().length !== fractions.length
      ) {
        origin.set(fractions);
        target.set(fractions);
        morph.set(1);
        grow.set(0);
        grow.set(
          withTiming(1, {
            duration: growDuration,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.Never,
          }),
        );
      } else {
        const a = origin.get(),
          b = target.get(),
          p = morph.get();
        origin.set(fractions.map((_, i) => lerp(a[i] ?? 0, b[i] ?? 0, p)));
        target.set(fractions);
        morph.set(0);
        morph.set(
          withTiming(1, {
            duration: morphDuration,
            easing: Easing.inOut(Easing.cubic),
            reduceMotion: ReduceMotion.Never,
          }),
        );
      }
      entered.current = true;
      return () => {
        cancelAnimation(morph);
        cancelAnimation(grow);
      };
    }, [
      slices,
      measured,
      animate,
      growDuration,
      morphDuration,
      origin,
      target,
      morph,
      grow,
    ]);
    useEffect(() => {
      selectedIndex.set(selection);
      const next = selection >= 0 && selection < data.length ? 1 : 0;
      if (isActive.get() !== next) {
        isActive.set(
          withTiming(next, {
            duration: next ? 140 : 220,
            reduceMotion: ReduceMotion.Never,
          }),
        );
      }
      return () => cancelAnimation(isActive);
    }, [selection, data.length, selectedIndex, isActive]);
    const pad = toRadians(padAngle),
      start = toRadians(startAngle);
    const arcs = useDerivedValue<IPieChartArc[]>(() => {
      const a = origin.get(),
        b = target.get();
      return makeArcs(
        b.map((fraction, i) => lerp(a[i] ?? 0, fraction, morph.get())),
        pad,
        start,
        grow.get() * TAU,
      );
    }, [pad, start]);
    const select = useCallback(
      (event: GestureResponderEvent) => {
        const index = hitSlice(
          slices,
          event.nativeEvent.locationX,
          event.nativeEvent.locationY,
          geometry,
          selection,
          padAngle,
          startAngle,
        );
        onSelectionChange?.(index === selection ? -1 : index);
      },
      [slices, geometry, selection, padAngle, startAngle, onSelectionChange],
    );
    const context = useMemo(
      () => ({
        data,
        slices,
        total: sumValues(data),
        width: size.width,
        height: size.height,
        centerX,
        centerY,
        radius,
        innerRadius: inner,
        activeOffset,
        bottomInset: 0,
        arcs,
        grow,
        isActive,
        selectedIndex,
      }),
      [
        data,
        slices,
        size,
        centerX,
        centerY,
        radius,
        inner,
        activeOffset,
        arcs,
        grow,
        isActive,
        selectedIndex,
      ],
    );
    const track = useMemo(
      () => arcPath(centerX, centerY, radius, inner, 0, TAU),
      [centerX, centerY, radius, inner],
    );
    return (
      <View style={[styles.root, style]} onLayout={measure}>
        <Pressable
          testID="pie-chart-touch"
          accessible={false}
          disabled={!data.length || !onSelectionChange}
          onPress={select}
          style={styles.fill}
        >
          <Canvas style={styles.fill}>
            {measured && (
              <>
                {!data.length && <Path path={track} color={trackColor} />}
                <PieChartContext.Provider value={context}>
                  {children}
                </PieChartContext.Provider>
              </>
            )}
          </Canvas>
        </Pressable>
      </View>
    );
  },
);
const Slice = memo(
  ({
    index,
    color,
    inactiveOpacity,
  }: {
    index: number;
    color: string;
    inactiveOpacity: number;
  }) => {
    const {
      arcs,
      centerX,
      centerY,
      radius,
      innerRadius,
      activeOffset,
      selectedIndex,
      isActive,
    } = usePieChart('Slices');
    const selection = useDerivedValue(
      () =>
        withSpring(selectedIndex.get() === index ? 1 : 0, {
          ...SPRING_CONFIG,
          reduceMotion: ReduceMotion.Never,
        }),
      [index],
    );
    const path = useDerivedValue(() => {
      const arc = arcs.get()[index];
      return arc
        ? slicePath(arc, {
            centerX,
            centerY,
            radius,
            innerRadius,
            activeOffset,
          })
        : 'M 0 0';
    }, [index, centerX, centerY, radius, innerRadius, activeOffset]);
    // A mola desloca o Path no Skia; não precisa reconstruir a geometria a cada frame de seleção.
    const transform = useDerivedValue(() => {
      const arc = arcs.get()[index];
      const theta = ANGLE_ORIGIN + (arc?.mid ?? 0);
      const push = selection.get() * isActive.get() * activeOffset;
      return [
        { translateX: Math.cos(theta) * push },
        { translateY: Math.sin(theta) * push },
      ];
    }, [index, activeOffset]);
    const opacity = useDerivedValue(
      () => 1 - isActive.get() * (1 - inactiveOpacity) * (1 - selection.get()),
      [inactiveOpacity],
    );
    return (
      <Path path={path} transform={transform} color={color} opacity={opacity} />
    );
  },
);
const PieChartSlices = memo(
  ({ colors = SLICE_COLORS, inactiveOpacity = 0.35 }: IPieChartSlices) => {
    const { data } = usePieChart('Slices');
    return (
      <>
        {data.map((point, index) => (
          <Slice
            key={point.label + index}
            index={index}
            color={point.color ?? colors[index % colors.length]!}
            inactiveOpacity={inactiveOpacity}
          />
        ))}
      </>
    );
  },
);
const styles = StyleSheet.create({
  root: { width: '100%', height: '100%' },
  fill: { flex: 1 },
});
const Root = createCompoundComponent('PieChart.Root', PieChartRoot);
const Slices = createCompoundComponent('PieChart.Slices', PieChartSlices);
const PieChart = createCompoundComponent('PieChart', Root, { Root, Slices });
export { PieChart };
export default PieChart;
