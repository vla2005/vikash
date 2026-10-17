// Adaptação web do Bar Chart Reacticx: mesmos helpers de domínio/geometria e API.
/* eslint-disable react-native/no-inline-styles -- transformOrigin e animação variam por barra. */
// SVG/CSS mantém o crescimento escalonado sem Skia WASM ou JS por quadro.
import React, {
  createContext,
  memo,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { createCompoundComponent } from '../../../utils/create-compound-component';
import {
  buildGridPath,
  indexForX,
  toDomain,
  toSlots,
  valueToHeight,
} from './helper';
import {
  BAR_COLOR,
  BAR_RATIO,
  BOTTOM_INSET,
  GROW_DURATION,
  LEFT_INSET,
  TICK_COUNT,
  TOP_INSET,
} from './const';
const Context = createContext(null);
const Root = memo(function BarChartRoot({
  children,
  data,
  selectedIndex = -1,
  onSelectionChange,
  style,
  leftInset = LEFT_INSET,
  bottomInset = BOTTOM_INSET,
  topInset = TOP_INSET,
  tickCount = TICK_COUNT,
  barRatio = BAR_RATIO,
  maxY,
  animate = true,
  growDuration = GROW_DURATION,
  enablePan = true,
  onBarChange,
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const context = useMemo(() => {
    const plotBottom = Math.max(topInset, size.height - bottomInset),
      plotHeight = plotBottom - topInset;
    const domain = toDomain(data, tickCount, maxY),
      slots = toSlots(
        data.length,
        leftInset,
        Math.max(0, size.width - leftInset),
        barRatio,
      );
    return {
      data,
      selectedIndex,
      domain,
      slots,
      plotLeft: leftInset,
      plotTop: topInset,
      plotBottom,
      plotHeight,
      width: size.width,
      height: size.height,
      animate,
      growDuration,
    };
  }, [
    data,
    selectedIndex,
    size,
    leftInset,
    bottomInset,
    topInset,
    tickCount,
    barRatio,
    maxY,
    animate,
    growDuration,
  ]);
  const canvas = [],
    overlay = [];
  React.Children.forEach(children, child =>
    (child?.type?.barChartOverlay ? overlay : canvas).push(child),
  );
  return (
    <View
      style={[s.root, style]}
      onLayout={({ nativeEvent: { layout } }) =>
        setSize(old =>
          old.width === layout.width && old.height === layout.height
            ? old
            : { width: layout.width, height: layout.height },
        )
      }
    >
      <Pressable
        accessible={false}
        disabled={!enablePan || !onSelectionChange}
        style={s.fill}
        onPress={event => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const index = indexForX(
            context.slots,
            ((event.nativeEvent.clientX - bounds.left) * size.width) /
              (bounds.width || 1),
          );
          if (index >= 0) {
            onBarChange?.(data[index], index);
            onSelectionChange(index === selectedIndex ? -1 : index);
          }
        }}
      >
        <Context.Provider value={context}>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${Math.max(1, size.width)} ${Math.max(
              1,
              size.height,
            )}`}
            aria-hidden
            style={s.art}
          >
            <style>
              {
                '@keyframes vikash-bar-grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}'
              }
            </style>
            {canvas}
          </Svg>
          {overlay}
        </Context.Provider>
      </Pressable>
    </View>
  );
});
const Bars = memo(function BarChartBars({
  color = BAR_COLOR,
  activeColor,
  radius = 7,
}) {
  const c = useContext(Context);
  return (
    <>
      {c.slots.map((slot, index) => {
        const height = valueToHeight(
          c.data[index].value,
          c.domain.min,
          c.domain.max,
          c.plotHeight,
        );
        return (
          <Rect
            key={index}
            x={slot.x}
            y={c.plotBottom - height}
            width={slot.width}
            height={height}
            rx={Math.min(radius, height / 2)}
            fill={
              index === c.selectedIndex
                ? activeColor || c.data[index].color || color
                : c.data[index].color || color
            }
            opacity={
              c.selectedIndex < 0 || index === c.selectedIndex ? 1 : 0.38
            }
            style={{
              transformOrigin: `${slot.center}px ${c.plotBottom}px`,
              animation: c.animate
                ? `vikash-bar-grow ${
                    c.growDuration
                  }ms cubic-bezier(.33,1,.68,1) ${index * 35}ms both`
                : 'none',
              transition: 'opacity 180ms ease,fill 180ms ease',
            }}
          />
        );
      })}
    </>
  );
});
const Grid = ({ color = 'rgba(255,255,255,.08)' }) => {
  const c = useContext(Context);
  return (
    <Path
      d={buildGridPath(
        c.domain,
        c.plotLeft,
        c.width,
        c.plotBottom,
        c.plotHeight,
      )}
      stroke={color}
      fill="none"
    />
  );
};
const XAxis = ({ style, activeStyle, format }) => {
  const c = useContext(Context),
    width = (c.width - c.plotLeft) / (c.data.length || 1);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {c.slots.map((slot, index) => (
        <Text
          key={index}
          numberOfLines={1}
          style={[
            s.axis,
            { top: c.plotBottom + 8, left: slot.center - width / 2, width },
            style,
            index === c.selectedIndex && activeStyle,
          ]}
        >
          {format ? format(c.data[index], index) : c.data[index].label}
        </Text>
      ))}
    </View>
  );
};
const CompoundRoot = createCompoundComponent('BarChart.Root', Root);
const BarChart = createCompoundComponent('BarChart', CompoundRoot, {
  Root: CompoundRoot,
  Bars: createCompoundComponent('BarChart.Bars', Bars),
  Grid: createCompoundComponent('BarChart.Grid', Grid),
  XAxis: createCompoundComponent('BarChart.XAxis', XAxis, {
    barChartOverlay: true,
  }),
});
const s = StyleSheet.create({
  root: { width: '100%', height: 260 },
  fill: { flex: 1 },
  art: { pointerEvents: 'none' },
  axis: {
    position: 'absolute',
    textAlign: 'center',
    fontSize: 11,
    color: '#B0B0B4',
  },
});
export default BarChart;
export { BarChart };
