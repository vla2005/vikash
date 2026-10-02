import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedMicButton from './AnimatedMicButton';
import Icon from './Icon';
import { colors, fontFamily, typography } from '../theme';

export default function VoiceDrawer({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel="Fechar registro por voz" onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.drawer, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}>
        <View style={styles.handle} />
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar microfone" onPress={onClose} hitSlop={12} style={styles.close}><Icon name="close" color={colors.secondary} /></Pressable>
        <View style={styles.microphone}><AnimatedMicButton large animate={false} /></View>
        <Text style={styles.title}>Novo registro</Text>
        <Text style={styles.description}>O registro por voz estará disponível em breve.</Text>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(37,40,36,0.28)' },
  drawer: { width: '100%', maxWidth: 460, backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 12, paddingHorizontal: 30, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border },
  close: { position: 'absolute', right: 24, top: 25, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  microphone: { marginTop: 38, marginBottom: 24 },
  title: { ...typography.title, fontSize: 25, lineHeight: 32 },
  description: { fontFamily, fontSize: 15, lineHeight: 23, color: colors.secondary, textAlign: 'center', marginTop: 12, maxWidth: 280 },
});
