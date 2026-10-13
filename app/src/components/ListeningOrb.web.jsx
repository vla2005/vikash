import React, { memo, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import ListeningOrbSurface from './ListeningOrbSurface';
import { voiceOrb } from '../theme/silver';
import { createOrbMesh, projectOrb } from '../utils/listeningOrb';

const mesh = createOrbMesh();
const initialShape = projectOrb(mesh, 0, voiceOrb.radius, voiceOrb.deformation);
function updatePath(element, path) {
  // Expo web fornece a instância SVG; o adaptador Vite fornece o nó DOM.
  if (element?.setNativeProps) {
    element.setNativeProps({ style: { d: path } });
  } else {
    element?.setAttribute('d', path);
  }
}
export default memo(function ListeningOrb({ active, size = voiceOrb.size }) {
  const front = useRef(null);
  const back = useRef(null);
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background',
  );
  const running = active && foreground;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setForeground(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let frame;
    let started;
    function draw(now) {
      if (started === undefined) {
        started = now;
      }
      const phase =
        (((now - started) % voiceOrb.duration) / voiceOrb.duration) *
        Math.PI *
        2;
      const shape = projectOrb(
        mesh,
        phase,
        voiceOrb.radius,
        voiceOrb.deformation,
      );
      updatePath(front.current, shape.front);
      updatePath(back.current, shape.back);
      frame = requestAnimationFrame(draw);
    }
    if (running) {
      frame = requestAnimationFrame(draw);
    }
    return () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, [running]);
  return (
    <ListeningOrbSurface
      active={active}
      size={size}
      frontProps={{ ref: front, d: initialShape.front }}
      backProps={{ ref: back, d: initialShape.back }}
    />
  );
});
