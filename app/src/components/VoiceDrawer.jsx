import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedMicButton from './AnimatedMicButton';
import VoiceWaveform from './VoiceWaveform';
import Icon from './Icon';
import useVoiceTranscription from '../hooks/useVoiceTranscription';
import { fontFamily } from '../theme';

export default function VoiceDrawer({ visible, onClose, onConfirm }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const voice = useVoiceTranscription(visible);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const submitting = useRef(false);
  const slide = useRef(new Animated.Value(180)).current;
  const input = useRef(null);
  const review = voice.phase === 'review';
  const listening = voice.phase === 'listening';
  useEffect(() => {
    if (!visible) { slide.setValue(180); return; }
    setFeedback('');
    const animation = Animated.spring(slide, { toValue: 0, damping: 24, stiffness: 200, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [visible, slide]);
  function close() { if (submitting.current) { return; } voice.cancel(); onClose(); }
  async function confirm() {
    if (!voice.text.trim() || submitting.current) { return; }
    if (!onConfirm) { setFeedback('A análise estará disponível quando a integração com a API estiver pronta.'); return; }
    setFeedback('');
    submitting.current = true;
    setSending(true);
    try { await onConfirm(voice.text.trim()); submitting.current = false; close(); }
    catch (failure) { setFeedback(failure.message || 'Não foi possível analisar o texto. Tente novamente.'); }
    finally { submitting.current = false; setSending(false); }
  }
  const time = `${String(Math.floor(voice.seconds / 60)).padStart(2, '0')}:${String(voice.seconds % 60).padStart(2, '0')}`;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
      <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel="Fechar registro por voz" onPress={close} />
      <Animated.View accessibilityViewIsModal style={[styles.drawer, { maxHeight: height - insets.top - 16, paddingBottom: Math.max(insets.bottom, 12) + 12, transform: [{ translateY: slide }] }]}>
        <View style={styles.handle} />
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar microfone" onPress={close} hitSlop={12} style={styles.close}><Icon name="close" size={18} color="#8A8B90" /></Pressable>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {review ? <>
            <Text accessibilityRole="header" style={styles.reviewTitle}>Confira o que você disse</Text>
            <Text style={styles.subtitle}>Edite o texto se precisar.</Text>
            <View style={styles.reviewMic}><Icon name="microphone" size={34} color="#303747" /></View>
            <View style={styles.editor}>
              <TextInput ref={input} accessibilityLabel="Texto transcrito" multiline value={voice.text} onChangeText={voice.setText} style={styles.input} textAlignVertical="top" editable={!sending} />
              <Pressable accessibilityRole="button" accessibilityLabel="Editar transcrição" onPress={() => input.current?.focus()} style={styles.edit}><Icon name="edit" size={20} color="#5C6476" /></Pressable>
            </View>
          </> : <>
            <View style={styles.microphone}><AnimatedMicButton large diameter={112} animate={listening} /></View>
            <Text accessibilityRole="header" style={styles.title}>{listening ? 'Ouvindo você' : voice.phase === 'starting' ? 'Preparando microfone' : voice.phase === 'stopping' ? 'Finalizando transcrição' : 'Não foi possível ouvir'}</Text>
            <Text style={styles.timer}>{time}</Text>
            <VoiceWaveform active={listening} />
            <View style={styles.transcription}>
              <Text style={styles.label}>Transcrição em tempo real</Text>
              <Text accessibilityLiveRegion="polite" style={[styles.transcript, !voice.text && styles.placeholder]}>{voice.text || (listening ? 'Fale sobre seu lançamento…' : 'Sua fala aparecerá aqui.')}{listening && <Text style={styles.cursor}> ▎</Text>}</Text>
            </View>
            {!!voice.error && <Text accessibilityRole="alert" style={styles.error}>{voice.error}</Text>}
          </>}
        </ScrollView>
        <View style={styles.footer}>
          {review ? <>
            <Pressable accessibilityRole="button" accessibilityLabel="Confirmar e analisar" disabled={!voice.text.trim() || sending} onPress={confirm} style={({ pressed }) => [styles.primary, pressed && styles.pressed, (!voice.text.trim() || sending) && styles.disabled]}><Text style={styles.primaryText}>{sending ? 'Analisando…' : 'Confirmar e analisar'}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Gravar novamente" disabled={sending} onPress={() => { setFeedback(''); voice.start(); }} style={styles.outlined}><Text style={styles.outlinedText}>Gravar novamente</Text></Pressable>
            {!!feedback && <Text accessibilityRole="alert" style={styles.feedback}>{feedback}</Text>}
            <View style={styles.notice}><Icon name="info" size={15} color="#697084" /><Text style={styles.noticeText}>A análise começa após sua confirmação.</Text></View>
          </> : <>
            <Pressable accessibilityRole="button" accessibilityLabel={voice.phase === 'error' ? 'Tentar novamente' : 'Parar e revisar'} disabled={voice.phase === 'starting' || voice.phase === 'stopping'} onPress={voice.phase === 'error' ? voice.start : voice.stop} style={({ pressed }) => [styles.primary, pressed && styles.pressed, (voice.phase === 'starting' || voice.phase === 'stopping') && styles.disabled]}>
              {voice.phase !== 'error' && <View style={styles.stopIcon} />}<Text style={styles.primaryText}>{voice.phase === 'error' ? 'Tentar novamente' : 'Parar e revisar'}</Text>
            </Pressable>
            {voice.phase === 'error' && !!voice.text.trim() && <Pressable accessibilityRole="button" onPress={voice.review} style={styles.outlined}><Text style={styles.outlinedText}>Revisar texto capturado</Text></Pressable>}
            <Pressable accessibilityRole="button" accessibilityLabel="Cancelar gravação" onPress={close} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
            <Text style={styles.caption}>Você revisa o texto antes de enviar.</Text>
          </>}
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
  drawer: { width: '100%', maxWidth: 460, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 20 },
  handle: { width: 40, height: 4, borderRadius: 3, backgroundColor: '#CFCFD2', alignSelf: 'center' },
  close: { position: 'absolute', right: 12, top: 6, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  scroll: { flexShrink: 1 },
  content: { alignItems: 'center' },
  microphone: { marginTop: 46, marginBottom: 30 },
  title: { fontFamily, color: '#101114', fontWeight: '700', fontSize: 23, lineHeight: 30, textAlign: 'center' },
  timer: { fontFamily, fontSize: 14, color: '#77787B', marginTop: 3, fontVariant: ['tabular-nums'] },
  transcription: { width: '100%', marginTop: 3, marginBottom: 20, minHeight: 92 },
  label: { fontFamily, fontSize: 12, color: '#737478', marginBottom: 9 },
  transcript: { fontFamily, fontSize: 24, lineHeight: 31, color: '#111318', letterSpacing: -0.4 },
  placeholder: { color: '#9A9B9E', fontSize: 21 },
  cursor: { color: '#0666FF' },
  error: { fontFamily, fontSize: 13, lineHeight: 19, color: '#A3322C', width: '100%', marginBottom: 18 },
  reviewTitle: { fontFamily, color: '#10131C', fontWeight: '700', fontSize: 25, lineHeight: 31, letterSpacing: -0.8, textAlign: 'center', marginTop: 30 },
  subtitle: { fontFamily, fontSize: 17, lineHeight: 24, color: '#5D6475', marginTop: 5, textAlign: 'center' },
  reviewMic: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F6F5F2', alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 18 },
  editor: { width: '100%', backgroundColor: '#F6F5F2', borderRadius: 13, marginBottom: 24, minHeight: 116 },
  input: { fontFamily, fontSize: 19, lineHeight: 26, color: '#111827', padding: 16, paddingRight: 42, minHeight: 116 },
  edit: { position: 'absolute', right: 8, top: 10, padding: 5 },
  footer: { width: '100%' },
  primary: { backgroundColor: '#0666FF', borderRadius: 18, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13 },
  primaryText: { fontFamily, color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  pressed: { backgroundColor: '#0054DE' },
  disabled: { opacity: 0.5 },
  stopIcon: { width: 15, height: 15, borderRadius: 2, backgroundColor: '#FFFFFF' },
  cancel: { height: 44, borderRadius: 18, borderWidth: 1, borderColor: '#DDDCD9', backgroundColor: '#FAF9F7', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  cancelText: { fontFamily, color: '#101114', fontSize: 15, fontWeight: '500' },
  outlined: { height: 46, borderRadius: 18, borderWidth: 1, borderColor: '#0666FF', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  outlinedText: { fontFamily, fontSize: 16, fontWeight: '600', color: '#0666FF' },
  caption: { fontFamily, fontSize: 12, color: '#77787B', textAlign: 'center', marginTop: 8 },
  notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 15 },
  noticeText: { fontFamily, fontSize: 12, color: '#697084' },
  feedback: { fontFamily, fontSize: 13, lineHeight: 18, color: '#697084', marginTop: 12, textAlign: 'center' },
});
