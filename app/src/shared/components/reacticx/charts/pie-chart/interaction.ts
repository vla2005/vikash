// Geometria compartilhada entre Skia, SVG e detecção de toque.
import { ANGLE_ORIGIN, TAU } from './const';
import { arcPath, toRadians } from './helper';
import type { IPieChartArc, IPieChartSlice } from './types';
export function plotGeometry(
  width: number,
  height: number,
  innerRadius = 0.66,
  activeOffset = 10,
) {
  const radius = Math.max(0, Math.min(width, height) / 2 - activeOffset - 4);
  return {
    centerX: width / 2,
    centerY: height / 2,
    radius,
    innerRadius: radius * Math.min(0.95, Math.max(0, innerRadius)),
    activeOffset,
  };
}
export function makeArcs(
  fractions: readonly number[],
  pad: number,
  startAngle = 0,
  limit = TAU,
): IPieChartArc[] {
  'worklet';
  let cursor = 0;
  return fractions.map(fraction => {
    const sweep = Math.max(0, fraction) * TAU;
    const gap = fractions.length === 1 ? 0 : Math.min(pad, sweep * 0.15);
    const start = cursor + gap / 2;
    const end = Math.max(start, Math.min(cursor + sweep - gap / 2, limit));
    cursor += sweep;
    return {
      start: startAngle + start,
      end: startAngle + end,
      mid: startAngle + cursor - sweep / 2,
    };
  });
}
export function slicePath(
  arc: IPieChartArc,
  geometry: ReturnType<typeof plotGeometry>,
  push = 0,
) {
  'worklet';
  const theta = ANGLE_ORIGIN + arc.mid;
  return arcPath(
    geometry.centerX + Math.cos(theta) * push,
    geometry.centerY + Math.sin(theta) * push,
    geometry.radius,
    geometry.innerRadius,
    arc.start,
    arc.end,
  );
}
export function hitSlice(
  slices: readonly IPieChartSlice[],
  x: number,
  y: number,
  geometry: ReturnType<typeof plotGeometry>,
  selectedIndex = -1,
  padAngle = 1.5,
  startAngle = 0,
): number {
  if (!Number.isFinite(x) || !Number.isFinite(y) || geometry.radius <= 0) {
    return -1;
  }
  const arcs = makeArcs(
    slices.map(slice => slice.fraction),
    toRadians(padAngle),
    toRadians(startAngle),
  );
  // A fatia destacada é testada na posição deslocada que o usuário está vendo.
  const order = arcs.map((_, i) => i);
  if (selectedIndex >= 0 && selectedIndex < order.length) {
    order.splice(selectedIndex, 1);
    order.unshift(selectedIndex);
  }
  for (const i of order) {
    const arc = arcs[i];
    const push = i === selectedIndex ? geometry.activeOffset : 0;
    const theta = ANGLE_ORIGIN + arc.mid;
    const dx = x - geometry.centerX - Math.cos(theta) * push;
    const dy = y - geometry.centerY - Math.sin(theta) * push;
    const distance = Math.hypot(dx, dy);
    if (distance < geometry.innerRadius || distance > geometry.radius) {
      continue;
    }
    const angle =
      (((Math.atan2(dy, dx) - ANGLE_ORIGIN - toRadians(startAngle)) % TAU) +
        TAU) %
      TAU;
    const start = arc.start - toRadians(startAngle),
      end = arc.end - toRadians(startAngle);
    if (angle >= start && angle < end && end > start) {
      return i;
    }
  }
  return -1;
}
