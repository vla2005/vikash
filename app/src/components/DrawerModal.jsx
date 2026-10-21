import { pointerEventsStyles } from '../theme/interaction';
import React, {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import useReducedMotion from '../hooks/useReducedMotion';
import useDrawerAnimation from '../hooks/useDrawerAnimation';

export const DrawerMotionContext = createContext(null);

// Medir antes da entrada; conservar o conteúdo até completar a saída.
export default function DrawerModal({ visible = true, children, reducedMotionOverride, ...props }) {
  const opened = useRef(visible);
  useLayoutEffect(() => {
    if (visible) { opened.current = true; }
  }, [visible]);
  // Formulários têm vários seletores fechados: não criar worklets/valores ainda.
  // Depois da primeira abertura, conservar a instância para reabertura e saída.
  if (!visible && !opened.current) {
    return <Modal {...props} visible={false} transparent animationType="none" statusBarTranslucent hardwareAccelerated={Platform.OS === 'android'} />;
  }
  return <DrawerPresentation {...props} reducedMotionOverride={reducedMotionOverride} visible={visible}>{children}</DrawerPresentation>;
}

function DrawerPresentation({
  visible = true,
  children,
  onShow,
  reducedMotionOverride,
  ...props
}) {
  const { height } = useWindowDimensions();
  const offscreen = Math.max(height, Dimensions.get('screen').height) + 24;
  const [present, setPresent] = useState(visible);
  const { slide, panelStyle, enter, exit, prepare, stop } = useDrawerAnimation(
    offscreen,
  );
  const screenOffset = useRef(offscreen);
  const panelHeight = useRef(offscreen);
  const lastContent = useRef(children);
  const preferenceReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? preferenceReducedMotion;
  const initialized = useRef(false);
  const measured = useRef(false);
  const shown = useRef(Platform.OS === 'web');
  const entered = useRef(false);
  const pendingEntry = useRef(false);
  const generation = useRef(0);

  useLayoutEffect(() => {
    screenOffset.current = offscreen;
  }, [offscreen]);
  useLayoutEffect(() => {
    if (visible) {
      lastContent.current = children;
    }
  }, [visible, children]);
  const startEntry = useCallback(() => {
    if (!pendingEntry.current || !measured.current || !shown.current) {
      return;
    }
    pendingEntry.current = false;
    const initial = !entered.current;
    entered.current = true;
    enter(initial);
  }, [enter]);
  const measure = useCallback(
    event => {
      panelHeight.current = Math.ceil(event.nativeEvent.layout.height) + 24;
      if (!measured.current) {
        measured.current = true;
        if (pendingEntry.current && !entered.current) {
          prepare(panelHeight.current);
        }
      }
      startEntry();
    },
    [prepare, startEntry],
  );
  const show = useCallback(
    event => {
      shown.current = true;
      startEntry();
      onShow?.(event);
    },
    [onShow, startEntry],
  );
  const resetHidden = useCallback(() => {
    initialized.current = false;
    measured.current = false;
    shown.current = Platform.OS === 'web';
    entered.current = false;
    pendingEntry.current = false;
    setPresent(false);
    prepare(screenOffset.current);
  }, [prepare]);

  useLayoutEffect(() => {
    const current = ++generation.current;
    if (visible) {
      if (!initialized.current) {
        initialized.current = true;
        measured.current = false;
        shown.current = Platform.OS === 'web';
        entered.current = false;
        prepare(screenOffset.current);
      }
      setPresent(true);
      if (reducedMotion) {
        pendingEntry.current = false;
        prepare(0);
      } else {
        pendingEntry.current = true;
        startEntry();
      }
    } else if (initialized.current) {
      pendingEntry.current = false;
      if (reducedMotion) {
        resetHidden();
      } else {
        exit(panelHeight.current, () => {
          if (generation.current === current) {
            resetHidden();
          }
        });
      }
    }
    return () => {
      generation.current = current + 1;
      pendingEntry.current = false;
      stop();
    };
  }, [visible, reducedMotion, prepare, startEntry, exit, resetHidden, stop]);
  useEffect(() => stop, [stop]);
  const motion = useMemo(
    () => ({ slide, panelStyle, measure }),
    [slide, panelStyle, measure],
  );

  return (
    <Modal
      hardwareAccelerated={Platform.OS === 'android'}
      {...props}
      onShow={show}
      visible={visible || present}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      {(visible || present) && (
        <DrawerMotionContext.Provider value={motion}>
          <View style={[styles.frame, pointerEventsStyles[visible ? 'auto' : 'none']]} >
            {visible ? children : lastContent.current}
          </View>
        </DrawerMotionContext.Provider>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({ frame: { flex: 1 } });
