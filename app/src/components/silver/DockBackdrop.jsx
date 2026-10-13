import React from 'react';
import { BlurTargetView } from 'expo-blur';
import { useDock } from '../../contexts/DockContext';

export default function DockBackdrop({ children, style }) {
  const { blurTarget } = useDock();
  return (
    <BlurTargetView ref={blurTarget} style={style}>
      {children}
    </BlurTargetView>
  );
}
