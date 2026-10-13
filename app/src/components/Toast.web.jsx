import React from 'react';
import { StyleSheet } from 'react-native';
import useReducedMotion from '../hooks/useReducedMotion';
import ToastContent from './ToastContent';

export { toastVariants } from './ToastContent';

export default function Toast(props) {
  const reduced = useReducedMotion();
  return <ToastContent {...props} style={!reduced && s.enter} />;
}
const s = StyleSheet.create({
  enter: {
    animationKeyframes: {
      from: { transform: 'translateY(-6px)' },
      to: { transform: 'translateY(0)' },
    },
    animationDuration: '180ms',
    animationTimingFunction: 'cubic-bezier(.23,1,.32,1)',
  },
});
