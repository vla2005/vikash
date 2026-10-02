import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast, { toastVariants } from '../components/Toast';

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const sequence = useRef(0);
  const insets = useSafeAreaInsets();
  const hideToast = useCallback(() => { clearTimeout(timer.current); setToast(null); }, []);
  const showToast = useCallback(({ type = 'info', title, message, duration = 4500 }) => {
    if (!message) { return; }
    clearTimeout(timer.current);
    const id = ++sequence.current;
    const timeout = Number.isFinite(duration) ? Math.max(1500, duration) : 4500;
    setToast({ id, type: toastVariants[type] ? type : 'info', title, message, duration: timeout });
    timer.current = setTimeout(() => setToast(current => current?.id === id ? null : current), timeout);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);
  return <ToastContext.Provider value={value}>
    {children}
    {!!toast && <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 12 }]}><Toast key={toast.id} {...toast} onClose={hideToast} /></View>}
  </ToastContext.Provider>;
}
const styles = StyleSheet.create({ overlay: { position: 'absolute', left: 16, right: 16, zIndex: 1000, elevation: 20 } });
