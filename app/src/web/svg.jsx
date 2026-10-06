import React from 'react';

function shape(tag) {
  return function Shape({ children, accessible, ...props }) {
    return React.createElement(tag, props, children);
  };
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
export const ClipPath = shape('clipPath');
export const G = shape('g');
export const LinearGradient = shape('linearGradient');
export const Stop = shape('stop');
export const Text = shape('text');
export default Svg;
