import React from 'react';
import { StyleSheet } from 'react-native';

function shape(tag) {
  return React.forwardRef(function Shape({ children, accessible, collapsable, style, testID, rotation, origin, ...props }, ref) {
    const center = typeof origin === 'string' ? origin.replace(',', ' ') : '0 0';
    const transform = rotation != null ? `rotate(${rotation} ${center})` : props.transform;
    const strokeDasharray = Array.isArray(props.strokeDasharray) ? props.strokeDasharray.join(' ') : props.strokeDasharray;
    return React.createElement(tag, { ...props, ref, transform, strokeDasharray, style: StyleSheet.flatten(style), 'data-testid': testID }, children);
  });
}
export const Svg = shape('svg');
export const Path = shape('path');
export const Rect = shape('rect');
export const Circle = shape('circle');
export const Ellipse = shape('ellipse');
export const Line = shape('line');
export const Polyline = shape('polyline');
export const Polygon = shape('polygon');
export const Defs = shape('defs');
export const Mask = shape('mask');
export const ClipPath = shape('clipPath');
export const G = shape('g');
export const LinearGradient = shape('linearGradient');
export const Stop = shape('stop');
export const Text = shape('text');
export default Svg;
