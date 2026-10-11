import React, { createContext, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, StyleSheet, View } from 'react-native';
import useReducedMotion from '../hooks/useReducedMotion';

export const DrawerMotionContext = createContext(null);

// Keep the modal and its content mounted until the panel has left the screen.
export default function DrawerModal({ visible = true, children, ...props }) {
  const [present, setPresent] = useState(visible);
  const slide = useRef(new Animated.Value(180)).current;
  const panelHeight = useRef(1000);
  const lastContent = useRef(children);
  const reducedMotion = useReducedMotion();
  const measure = useCallback(event => {
    panelHeight.current = event.nativeEvent.layout.height + 24;
  }, []);
  const motion = useMemo(() => ({ slide, measure }), [slide, measure]);

  useLayoutEffect(() => {
    if (visible) { lastContent.current = children; }
  }, [visible, children]);

  useEffect(() => {
    if (!visible && !present) { slide.setValue(180); return; }
    if (visible) { setPresent(true); }
    if (reducedMotion) {
      slide.setValue(visible ? 0 : panelHeight.current);
      setPresent(visible);
      return;
    }
    let active = true;
    const animation = visible
      ? Animated.spring(slide, { toValue: 0, damping: 24, stiffness: 200, useNativeDriver: Platform.OS !== 'web' })
      : Animated.timing(slide, { toValue: panelHeight.current, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    animation.start(({ finished }) => {
      if (active && finished && !visible) {
        setPresent(false);
        slide.setValue(180);
      }
    });
    return () => { active = false; animation.stop(); };
  }, [visible, present, reducedMotion, slide]);

  return <Modal {...props} visible={visible || present} transparent animationType="none" statusBarTranslucent>
    {(visible || present) && <DrawerMotionContext.Provider value={motion}>
      <View style={styles.frame} pointerEvents={visible ? 'auto' : 'none'}>
        {visible ? children : lastContent.current}
      </View>
    </DrawerMotionContext.Provider>}
  </Modal>;
}

const styles = StyleSheet.create({ frame: { flex: 1 } });
