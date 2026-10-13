import { useCallback, useRef, useState } from 'react';

export default function useDrawerAnimation(initialOffset) {
  const [panelStyle, setPanelStyle] = useState({
    transform: [{ translateY: initialOffset }],
    transitionDuration: '0ms',
  });
  const frame = useRef(null);
  const timer = useRef(null);
  const stop = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const prepare = useCallback(
    offset => {
      stop();
      setPanelStyle({
        transform: [{ translateY: offset }],
        transitionDuration: '0ms',
      });
    },
    [stop],
  );
  const enter = useCallback(
    initial => {
      stop();
      const show = () => {
        frame.current = null;
        setPanelStyle({
          transform: [{ translateY: 0 }],
          transitionDuration: '300ms',
          transitionTimingFunction: 'cubic-bezier(.32,.72,0,1)',
        });
      };
      if (initial) {
        // Pintar fora da tela antes de iniciar a transição.
        frame.current = requestAnimationFrame(() => {
          frame.current = requestAnimationFrame(show);
        });
      } else {
        show();
      }
    },
    [stop],
  );
  const exit = useCallback(
    (offset, complete) => {
      stop();
      setPanelStyle({
        transform: [{ translateY: offset }],
        transitionDuration: '260ms',
        transitionTimingFunction: 'cubic-bezier(.3333333333,0,.6666666667,0)',
      });
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        timer.current = setTimeout(complete, 260);
      });
    },
    [stop],
  );
  return { panelStyle, enter, exit, prepare, stop };
}
