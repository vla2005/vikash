import { useInputTheme, useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedMicButton from './AnimatedMicButton';
import VoiceWaveform from './VoiceWaveform';
import Icon from './Icon';
import useVoiceTranscription from '../hooks/useVoiceTranscription';
import DrawerModal from './DrawerModal';
import DrawerPanel from './DrawerPanel';
import { fontFamilyMedium, fontFamilyBold, fontFamily } from '../theme';

export default function VoiceDrawer({ visible, onClose, onConfirm }) {
  const inputTheme = useInputTheme();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const voice = useVoiceTranscription(visible);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const submitting = useRef(false);
  const input = useRef(null);
  const review = voice.phase === 'review';
  const listening = voice.phase === 'listening';
  useEffect(() => {
    if (visible) { setFeedback(''); }
  }, [visible]);
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
  return <DrawerModal visible={visible} onRequestClose={close}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
      <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel="Fechar registro por voz" onPress={close} />
      <DrawerPanel style={[styles.drawer, { maxHeight: height - insets.top - 16, paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <View style={styles.handle} />
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar microfone" onPress={close} hitSlop={12} style={styles.close}><Icon name="close" size={18} color={colors.secondary} /></Pressable>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {review ? <>
            <Text accessibilityRole="header" style={styles.reviewTitle}>Confira o que você disse</Text>
            <Text style={styles.subtitle}>Edite o texto se precisar.</Text>
            <View style={styles.reviewMic}><Icon name="microphone" size={34} color={colors.secondary} /></View>
            <View style={styles.editor}>
              <TextInput {...inputTheme} ref={input} accessibilityLabel="Texto transcrito" multiline value={voice.text} onChangeText={voice.setText} style={styles.input} textAlignVertical="top" editable={!sending} />
              <Pressable accessibilityRole="button" accessibilityLabel="Editar transcrição" onPress={() => input.current?.focus()} style={styles.edit}><Icon name="edit" size={20} color={colors.secondary} /></Pressable>
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
            <View style={styles.notice}><Icon name="info" size={15} color={colors.secondary} /><Text style={styles.noticeText}>A análise começa após sua confirmação.</Text></View>
          </> : <>
            <Pressable accessibilityRole="button" accessibilityLabel={voice.phase === 'error' ? 'Tentar novamente' : 'Parar e revisar'} disabled={voice.phase === 'starting' || voice.phase === 'stopping'} onPress={voice.phase === 'error' ? voice.start : voice.stop} style={({ pressed }) => [styles.primary, pressed && styles.pressed, (voice.phase === 'starting' || voice.phase === 'stopping') && styles.disabled]}>
              {voice.phase !== 'error' && <View style={styles.stopIcon} />}<Text style={styles.primaryText}>{voice.phase === 'error' ? 'Tentar novamente' : 'Parar e revisar'}</Text>
            </Pressable>
            {voice.phase === 'error' && !!voice.text.trim() && <Pressable accessibilityRole="button" onPress={voice.review} style={styles.outlined}><Text style={styles.outlinedText}>Revisar texto capturado</Text></Pressable>}
            <Pressable accessibilityRole="button" accessibilityLabel="Cancelar gravação" onPress={close} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
            <Text style={styles.caption}>Você revisa o texto antes de enviar.</Text>
          </>}
        </View>
      </DrawerPanel>
    </KeyboardAvoidingView>
  </DrawerModal>;
}
const createStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: colors.dialogBackdrop },
  backdrop: { ...StyleSheet.absoluteFill },
  drawer: { width: '100%', maxWidth: 460, backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 12, paddingHorizontal: 20 },
  handle: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.handle, alignSelf: 'center' },
  close: { position: 'absolute', right: 12, top: 6, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  scroll: { flexShrink: 1 },
  content: { alignItems: 'center' },
  microphone: { marginTop: 46, marginBottom: 30 },
  title: { fontFamily: fontFamilyBold, color: colors.text, fontWeight: '700', fontSize: 23, lineHeight: 30, textAlign: 'center' },
  timer: { fontFamily, fontSize: 14, color: colors.secondary, marginTop: 3, fontVariant: ['tabular-nums'] },
  transcription: { width: '100%', marginTop: 3, marginBottom: 20, minHeight: 92 },
  label: { fontFamily, fontSize: 12, color: colors.secondary, marginBottom: 9 },
  transcript: { fontFamily, fontSize: 24, lineHeight: 31, color: colors.text, letterSpacing: -0.4 },
  placeholder: { color: colors.secondary, fontSize: 21 },
  cursor: { color: colors.primary },
  error: { fontFamily, fontSize: 13, lineHeight: 19, color: colors.error, width: '100%', marginBottom: 18 },
  reviewTitle: { fontFamily: fontFamilyBold, color: colors.text, fontWeight: '700', fontSize: 25, lineHeight: 31, letterSpacing: -0.8, textAlign: 'center', marginTop: 30 },
  subtitle: { fontFamily, fontSize: 17, lineHeight: 24, color: colors.secondary, marginTop: 5, textAlign: 'center' },
  reviewMic: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 18 },
  editor: { width: '100%', backgroundColor: colors.surfaceMuted, borderRadius: 20, marginBottom: 24, minHeight: 116 },
  input: { fontFamily, fontSize: 19, lineHeight: 26, color: colors.text, padding: 16, paddingRight: 42, minHeight: 116 },
  edit: { position: 'absolute', right: 8, top: 10, padding: 5 },
  footer: { width: '100%' },
  primary: { backgroundColor: colors.brandPrimary, borderRadius: 18, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13 },
  primaryText: { fontFamily: fontFamilyMedium, color: colors.onBrand, fontSize: 16, fontWeight: '600' },
  pressed: { backgroundColor: colors.primaryPressed },
  disabled: { opacity: 0.5 },
  stopIcon: { width: 15, height: 15, borderRadius: 2, backgroundColor: colors.surface },
  cancel: { height: 44, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  cancelText: { fontFamily: fontFamilyMedium, color: colors.text, fontSize: 15, fontWeight: '500' },
  outlined: { height: 46, borderRadius: 18, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  outlinedText: { fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600', color: colors.primary },
  caption: { fontFamily, fontSize: 12, color: colors.secondary, textAlign: 'center', marginTop: 8 },
  notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 15 },
  noticeText: { fontFamily, fontSize: 12, color: colors.secondary },
  feedback: { fontFamily, fontSize: 13, lineHeight: 18, color: colors.secondary, marginTop: 12, textAlign: 'center' },
});
