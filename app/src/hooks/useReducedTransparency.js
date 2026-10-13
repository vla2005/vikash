import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export default function useReducedTransparency() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then(value => {
        if (active) {
          setReduced(value);
        }
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduced,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return reduced;
}
