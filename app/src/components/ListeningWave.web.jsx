import React, { memo, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import ListeningWaveSurface from './ListeningWaveSurface';
import { voiceOrb } from '../theme/silver';
import { projectListeningWave } from '../utils/listeningWave';

const initialShape = projectListeningWave(0);
function updatePath(element, path) {
  if (element?.setNativeProps) {
    element.setNativeProps({ style: { d: path } });
  } else {
    element?.setAttribute('d', path);
  }
}
export default memo(function ListeningWave({ active, compact }) {
  const strands = useRef(null);
  const ribs = useRef(null);
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
        (((now - started) % voiceOrb.wave.duration) / voiceOrb.wave.duration) *
        Math.PI *
        2;
      const shape = projectListeningWave(phase);
      updatePath(strands.current, shape.strands);
      updatePath(ribs.current, shape.ribs);
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
    <ListeningWaveSurface
      active={active}
      compact={compact}
      strandsProps={{ ref: strands, d: initialShape.strands }}
      ribsProps={{ ref: ribs, d: initialShape.ribs }}
    />
  );
});
