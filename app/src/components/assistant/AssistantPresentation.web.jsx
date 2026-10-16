import React, { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import AssistantDockMotion from './AssistantDockMotion';
export default function AssistantPresentation({ children, backdrop, opening, closing, transition, onFinished, onOpened, onPresented, onDockCovered, frameRef, flightRef }) {
  useLayoutEffect(() => { onPresented?.(); },[onPresented]);
  return <View ref={frameRef} style={StyleSheet.absoluteFill}>
    <AssistantDockMotion backdrop={backdrop} opening={opening} closing={closing} transition={transition} onFinished={onFinished} onOpened={onOpened} onDockCovered={onDockCovered} flightRef={flightRef}>{children}</AssistantDockMotion>
  </View>;
}
