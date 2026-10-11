import React, { useContext } from 'react';
import { Animated } from 'react-native';
import { DrawerMotionContext } from './DrawerModal';

// The backdrop stays stationary while the panel enters or leaves.
export default function DrawerPanel({ style, children, onLayout, ...props }) {
  const motion = useContext(DrawerMotionContext);
  return <Animated.View accessibilityViewIsModal {...props} onLayout={event => { motion?.measure(event); onLayout?.(event); }}
    style={[style, { transform: [{ translateY: motion?.slide ?? 0 }] }]}>{children}</Animated.View>;
}
