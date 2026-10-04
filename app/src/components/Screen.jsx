import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import FormFocusContext from '../contexts/FormFocusContext';

export default function Screen({ children, contentStyle, decoration }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const focusedInput = useRef(null);
  const frame = useRef(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const revealInput = useCallback(() => {
    if (Platform.OS === 'web') { return; }
    if (frame.current != null) { cancelAnimationFrame(frame.current); }
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (focusedInput.current) {
        scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(focusedInput.current, 28, true);
      }
    });
  }, []);
  const focus = useMemo(() => ({
    onFocus: input => { focusedInput.current = input; revealInput(); },
    onBlur: input => { if (focusedInput.current === input) { focusedInput.current = null; } },
  }), [revealInput]);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => { setKeyboardOpen(true); revealInput(); });
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { shown.remove(); hidden.remove(); if (frame.current != null) { cancelAnimationFrame(frame.current); } };
  }, [revealInput]);
  return (
    <View style={styles.background}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <View style={styles.canvas}>
          {decoration && <View pointerEvents="none" style={styles.decoration}>{decoration}</View>}
          <ScrollView ref={scrollRef} style={styles.scroll} onLayout={revealInput} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) + 20, paddingBottom: Math.max(insets.bottom, 18) + 12 }, contentStyle, keyboardOpen && styles.editing]}>
            <FormFocusContext.Provider value={focus}>{children}</FormFocusContext.Provider>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  canvas: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center', overflow: 'hidden', backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  editing: { justifyContent: 'flex-start', paddingBottom: 48 },
  decoration: { position: 'absolute', bottom: -32, right: -26, left: 24, height: 240 },
});
