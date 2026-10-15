// Variante SVG do componente copiado do Reacticx. Animações CSS, sem Worklets/JS por frame.
import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Mask, Path } from 'react-native-svg';
import { createCompoundComponent } from '../../../utils/create-compound-component';
import { arcPath, toRadians, toSlices } from './helper';
import { hitSlice, makeArcs, plotGeometry, slicePath } from './interaction';
import {
  ANGLE_ORIGIN,
  GROW_DURATION,
  MORPH_DURATION,
  SLICE_COLORS,
  TAU,
} from './const';
const Context = createContext(null);
const RootView = memo(function PieChartRoot({
  data,
  children,
  innerRadius = 0.66,
  activeOffset = 10,
  padAngle = 1.5,
  startAngle = 0,
  selectedIndex = -1,
  onSelectionChange,
  animate = true,
  growDuration = GROW_DURATION,
  morphDuration = MORPH_DURATION,
  trackColor = 'transparent',
  style,
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const id = `pie-${useId().replace(/:/g, '')}`;
  const measure = useCallback(
    ({ nativeEvent: { layout } }) =>
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
  const arcs = useMemo(
    () =>
      makeArcs(
        slices.map(slice => slice.fraction),
        toRadians(padAngle),
        toRadians(startAngle),
      ),
    [slices, padAngle, startAngle],
  );
  const select = useCallback(
    event => {
      // onPress web recebe MouseEvent; locationX/Y só existem no evento nativo.
      const bounds = event.currentTarget.getBoundingClientRect();
      const x =
        ((event.nativeEvent.clientX - bounds.left) * size.width) /
        (bounds.width || 1);
      const y =
        ((event.nativeEvent.clientY - bounds.top) * size.height) /
        (bounds.height || 1);
      const index = hitSlice(
        slices,
        x,
        y,
        geometry,
        selectedIndex,
        padAngle,
        startAngle,
      );
      onSelectionChange?.(index === selectedIndex ? -1 : index);
    },
    [
      slices,
      geometry,
      selectedIndex,
      padAngle,
      startAngle,
      onSelectionChange,
      size,
    ],
  );
  const { centerX, centerY, radius, innerRadius: inner } = geometry;
  const middle = (radius + inner) / 2,
    length = TAU * middle;
  const value = { data, arcs, geometry, selectedIndex, morphDuration };
  const revealStyle = {
    '--pie-length': length,
    animation:
      animate && data.length
        ? `vikash-pie-reveal ${growDuration}ms cubic-bezier(.33,1,.68,1) both`
        : 'none',
  };
  return (
    <View onLayout={measure} style={[styles.root, style]}>
      <Pressable
        testID="pie-chart-touch"
        accessible={false}
        disabled={!data.length || !onSelectionChange}
        onPress={select}
        style={styles.fill}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${Math.max(size.width, 1)} ${Math.max(size.height, 1)}`}
          aria-hidden
          style={styles.art}
        >
          <style>
            {
              '@keyframes vikash-pie-reveal {from{stroke-dashoffset:var(--pie-length)}to{stroke-dashoffset:0}}'
            }
          </style>
          {!data.length && (
            <Path
              d={arcPath(centerX, centerY, radius, inner, 0, TAU)}
              fill={trackColor}
            />
          )}
          <Defs>
            <Mask
              id={id}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={size.width}
              height={size.height}
            >
              <Circle
                key={data.length}
                cx={centerX}
                cy={centerY}
                r={middle}
                fill="none"
                stroke="white"
                strokeWidth={radius - inner + 2 * activeOffset + 4}
                strokeDasharray={`${length} ${length}`}
                rotation={startAngle - 90}
                origin={`${centerX}, ${centerY}`}
                style={revealStyle}
              />
            </Mask>
          </Defs>
          <G mask={`url(#${id})`}>
            <Context.Provider value={value}>{children}</Context.Provider>
          </G>
        </Svg>
      </Pressable>
    </View>
  );
});
const SlicesView = memo(function PieChartSlices({
  colors = SLICE_COLORS,
  inactiveOpacity = 0.35,
}) {
  const { data, arcs, geometry, selectedIndex, morphDuration } =
    useContext(Context);
  return (
    <>
      {data.map((point, index) => {
        const arc = arcs[index],
          selected = index === selectedIndex;
        const push = selected ? geometry.activeOffset : 0;
        const theta = ANGLE_ORIGIN + arc.mid;
        const path = slicePath(arc, geometry);
        const motion = {
          transform: `translate(${Math.cos(theta) * push}px, ${
            Math.sin(theta) * push
          }px)`,
          transition: 'transform 480ms cubic-bezier(.22,1.45,.36,1)',
        };
        const fillStyle = {
          d: `path("${path}")`,
          opacity: selectedIndex >= 0 && !selected ? inactiveOpacity : 1,
          transition: `d ${morphDuration}ms cubic-bezier(.65,0,.35,1), opacity 180ms ease`,
        };
        return (
          <G key={point.label + index} style={motion}>
            <Path
              d={path}
              fill={point.color ?? colors[index % colors.length]}
              style={fillStyle}
            />
          </G>
        );
      })}
    </>
  );
});
const styles = StyleSheet.create({
  root: { width: '100%', height: '100%' },
  fill: { flex: 1 },
  art: { pointerEvents: 'none' },
});
const Root = createCompoundComponent('PieChart.Root', RootView);
const Slices = createCompoundComponent('PieChart.Slices', SlicesView);
const PieChart = createCompoundComponent('PieChart', Root, { Root, Slices });
export { PieChart };
export default PieChart;
