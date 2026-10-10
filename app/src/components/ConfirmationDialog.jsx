import React, { useRef } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import useReducedMotion from '../hooks/useReducedMotion';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

// The caller controls visibility, runs the action and supplies its loading/error states.
export default function ConfirmationDialog({ visible, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar',
  variant = 'primary', icon, loading = false, error, onConfirm, onCancel }) {
  const cancelButton = useRef(null);
  const reducedMotion = useReducedMotion();
  const danger = variant === 'danger';
  const accent = danger ? colors.error : colors.primary;
  const cancel = () => { if (!loading) { onCancel(); } };
  return <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'}
    statusBarTranslucent onRequestClose={cancel} onShow={() => cancelButton.current?.focus?.()}>
    <View style={styles.overlay}>
      <Pressable accessible={false} onPress={cancel} style={styles.backdrop} />
      <View accessibilityViewIsModal {...(Platform.OS === 'web' ? { role: 'dialog', 'aria-modal': true, 'aria-label': title } : {})}
        style={styles.card}>
        <ScrollView bounces={false} contentContainerStyle={styles.content}>
          <View style={styles.heading}>
            <View style={[styles.symbol, { backgroundColor: danger ? colors.errorSoft : colors.primarySoft }]}>
              <Icon name={icon || (danger ? 'warning' : 'info')} size={25} color={accent} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar confirmação" disabled={loading}
              onPress={cancel} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Icon name="close" size={21} color={colors.secondary} />
            </Pressable>
          </View>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <Pressable ref={cancelButton} accessibilityRole="button" disabled={loading} onPress={cancel}
              style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed, loading && styles.disabled]}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ busy: loading, disabled: loading }} disabled={loading}
              onPress={onConfirm} style={({ pressed }) => [styles.button, { backgroundColor: accent }, pressed && styles.pressed, loading && styles.disabled]}>
              <Text style={styles.confirmText}>{loading ? 'Aguarde…' : confirmText}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.dialogBackdrop },
  backdrop: { ...StyleSheet.absoluteFill },
  card: { width: '100%', maxWidth: 360, maxHeight: '90%', borderRadius: 28, backgroundColor: colors.surface, overflow: 'hidden' },
  content: { padding: 24 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  symbol: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  title: { fontFamily: fontFamilyBold, fontSize: 22, lineHeight: 30, letterSpacing: -0.6, fontWeight: '700', color: colors.text },
  message: { fontFamily, fontSize: 14, lineHeight: 23, color: colors.secondary, marginTop: 8 },
  error: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.error, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  button: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 12 },
  cancel: { backgroundColor: colors.surfaceMuted },
  cancelText: { fontFamily: fontFamilyMedium, fontWeight: '600', fontSize: 14, color: colors.text },
  confirmText: { fontFamily: fontFamilyMedium, fontWeight: '600', fontSize: 14, color: colors.surface },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
});
