import React from 'react';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

// Inclui os defaults de animações nativas que não passam uma opção individual.
export default function AppMotionPolicy() {
  return <ReducedMotionConfig mode={ReduceMotion.Never} />;
}
