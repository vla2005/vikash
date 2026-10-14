import { renderingEffects } from '../../config/renderingEffects';
import React from 'react';
import { View } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { useDock } from '../../contexts/DockContext';

export default function DockBackdrop({ children, style }) {
  const { blurTarget } = useDock();
  if (!renderingEffects.backgroundBlur) {
    return <View style={style}>{children}</View>;
  }
  return (
    <BlurTargetView ref={blurTarget} style={style}>
      {children}
    </BlurTargetView>
  );
}
