import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// AppState also observes document visibility in React Native Web.
export default function useAppActive(enabled = true) {
  const [active, setActive] = useState(
    () => !AppState.currentState || AppState.currentState === 'active',
  );
  useEffect(() => {
    if (!enabled) return;
    setActive(!AppState.currentState || AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state =>
      setActive(state === 'active'),
    );
    return () => subscription.remove();
  }, [enabled]);
  return enabled && active;
}
