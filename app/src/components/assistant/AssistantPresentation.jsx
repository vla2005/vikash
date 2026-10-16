import AssistantDockMotion from './AssistantDockMotion';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

export default function AssistantPresentation({ children, backdrop, onRequestClose, opening, closing, transition, onFinished, onOpened, onPresented, onDockCovered, frameRef, flightRef, startupTrace }) {
  const window = useWindowDimensions();
  const [bounds, setBounds] = useState(null);
  const [shown, setShown] = useState(false);
  const width = Math.min(bounds?.width || window.width, 460);
  const height = bounds?.height || window.height;
  useEffect(() => {
    if (shown && bounds) onPresented?.();
  }, [shown,bounds,onPresented]);
  return <Modal testID="assistant-presentation" visible transparent animationType="none"
    presentationStyle="overFullScreen" hardwareAccelerated={Platform.OS === 'android'}
    statusBarTranslucent navigationBarTranslucent
    onShow={() => {startupTrace?.mark('modal-shown');setShown(true);}} onRequestClose={onRequestClose}>
    <View testID="assistant-native-viewport" style={styles.viewport} onLayout={event => {
      startupTrace?.mark('modal-layout');
      const next = event.nativeEvent.layout;
      if (next.width > 0 && next.height > 0) {
        setBounds(old => old?.width === next.width ? (next.height > old.height ? {width:next.width,height:next.height} : old) : {width:next.width,height:next.height});
      }
    }}>
      <View ref={frameRef} collapsable={false} testID="assistant-native-frame" style={[styles.frame, { width, height }]}>
        {(shown || Platform.OS === 'android') && <AssistantDockMotion backdrop={backdrop} opening={opening} closing={closing} transition={transition} onFinished={onFinished} onOpened={onOpened} onDockCovered={onDockCovered} flightRef={flightRef}>{children}</AssistantDockMotion>}
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  viewport: { ...StyleSheet.absoluteFill, alignItems:'center' },
  frame: { position:'relative', flexShrink:0 },
});
