import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export default function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduced(preference.matches);
      const onChange = event => setReduced(event.matches);
      preference.addEventListener('change', onChange);
      return () => preference.removeEventListener('change', onChange);
    }
    let active = true;
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled()).then(value => {
      if (active) { setReduced(!!value); }
    }).catch(() => { if (active) { setReduced(false); } });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}
