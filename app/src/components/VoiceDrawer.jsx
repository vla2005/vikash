import { pointerEventsStyles } from '../theme/interaction';
import {
  useInputTheme,
  useTheme,
  useThemeStyles,
} from '../contexts/ThemeContext';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VoiceComposer from './VoiceComposer';
import VoiceModeFade from './VoiceModeFade';
import ListeningOrb from './ListeningOrb';
import ListeningWave from './ListeningWave';
import VoiceMicButton from './VoiceMicButton';
import VoiceScene from './VoiceScene';
import GlassBackButton from './GlassBackButton';
import Icon from './Icon';
import VoiceAnalysisFeedback from './VoiceAnalysisFeedback';
import voiceAnalysisFeedback from '../utils/voiceAnalysisFeedback';
import useVoiceTranscription from '../hooks/useVoiceTranscription';
import DrawerModal from './DrawerModal';
import DrawerPanel from './DrawerPanel';
import AmbientLight from './silver/AmbientLight';
import { fontFamilyMedium, fontFamilyBold, fontFamily } from '../theme';
import { voiceSceneLayout } from '../utils/voiceSceneLayout';

export default function VoiceDrawer({ visible, onClose, onConfirm }) {
  const inputTheme = useInputTheme();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 700;
  const [mode, setMode] = useState('voice');
  const [typedText, setTypedText] = useState('');
  const typing = mode === 'text';
  const voice = useVoiceTranscription(visible && !typing);
  const entryText = typing ? typedText : voice.text;
  const [feedback, setFeedback] = useState(null);
  const [sending, setSending] = useState(false);
  const [transcriptHeight, setTranscriptHeight] = useState(66);
  const [sceneHeight, setSceneHeight] = useState(Math.max(280, height - 210));
  const submitting = useRef(false);
  const session = useRef(0);
  const input = useRef(null);
  const typedInput = useRef(null);
  const focusSession = useRef(null);
  focusSession.current = { visible, typing };
  const focusTyped = useCallback(() => {
    if (
      focusSession.current?.visible &&
      focusSession.current?.typing &&
      AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive'
    ) {
      typedInput.current?.focus();
    }
  }, []);
  const review = !typing && voice.phase === 'review';
  const listening = !typing && voice.phase === 'listening';
  const failed = !typing && voice.phase === 'error';
  const preparing =
    !typing && (voice.phase === 'starting' || voice.phase === 'stopping');
  const busy = sending || preparing;
  useEffect(() => {
    const currentSession = ++session.current;
    if (!visible) {
      setMode('voice');
      setFeedback(null);
      setTypedText('');
      setTranscriptHeight(66);
      setSending(false);
      submitting.current = false;
      input.current?.blur();
      typedInput.current?.blur();
      Keyboard.dismiss();
    }
    // Pending analyses from a closed session cannot affect a later opening.
    return () => {
      session.current = currentSession + 1;
    };
  }, [visible]);
  function close() {
    if (submitting.current) {
      return;
    }
    voice.cancel();
    input.current?.blur();
    typedInput.current?.blur();
    Keyboard.dismiss();
    onClose();
  }
  function changeMode(next) {
    if (submitting.current || next === mode) {
      return;
    }
    voice.cancel();
    input.current?.blur();
    typedInput.current?.blur();
    Keyboard.dismiss();
    setFeedback(null);
    setMode(next);
  }
  function restart() {
    if (submitting.current || preparing) {
      return;
    }
    setFeedback(null);
    input.current?.blur();
    setTranscriptHeight(66);
    voice.start();
  }
  async function confirm() {
    if (!entryText.trim() || submitting.current) {
      return;
    }
    if (!onConfirm) {
      setFeedback(
        voiceAnalysisFeedback(
          new Error(
            'A análise estará disponível quando a integração com a API estiver pronta.',
          ),
        ),
      );
      return;
    }
    const currentSession = session.current;
    setFeedback(null);
    submitting.current = true;
    setSending(true);
    Keyboard.dismiss();
    try {
      await onConfirm(entryText.trim());
      if (session.current !== currentSession) {
        return;
      }
      submitting.current = false;
      close();
    } catch (failure) {
      if (session.current === currentSession) {
        setFeedback(voiceAnalysisFeedback(failure));
      }
    } finally {
      if (session.current === currentSession) {
        submitting.current = false;
        setSending(false);
      }
    }
  }
  const time = `${String(Math.floor(voice.seconds / 60)).padStart(
    2,
    '0',
  )}:${String(voice.seconds % 60).padStart(2, '0')}`;
  const liveText =
    voice.text.length > 180
      ? `…${voice.text.slice(-180).replace(/^\S*\s/, '')}`
      : voice.text;
  const {
    orbSize,
    distance: travel,
    visualOffset,
  } = voiceSceneLayout(width, sceneHeight, compact);
  const reviewLabel =
    feedback?.type === 'warn'
      ? 'Confirmar novamente'
      : feedback
      ? 'Tentar novamente'
      : 'Confirmar e analisar';
  const microphoneLabel = review
    ? reviewLabel
    : voice.phase === 'error'
    ? 'Tentar novamente'
    : 'Parar e revisar';
  return (
    <DrawerModal
      visible={visible}
      onRequestClose={close}
      navigationBarTranslucent
    >
      <DrawerPanel fullScreen testID="voice-fullscreen" style={styles.drawer}>
        <AmbientLight />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <View
            style={[
              styles.frame,
              {
                paddingTop: insets.top + 8,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.header}>
              <GlassBackButton
                accessibilityLabel={
                  typing
                    ? 'Voltar do registro por texto'
                    : 'Voltar do registro por voz'
                }
                onPress={close}
                disabled={sending}
              />
              <View style={styles.headerMark}>
                <Icon name="microphone" size={20} color={colors.primary} />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Novo lançamento</Text>
                <Text style={styles.headerSubtitle}>Fale ou digite</Text>
              </View>
            </View>
            <VoiceScene
              review={review || failed || (typing && !!feedback)}
              distance={travel}
              visualOffset={visualOffset}
              onLayout={event =>
                setSceneHeight(event.nativeEvent.layout.height)
              }
              visual={
                <>
                  <VoiceModeFade visible={!typing} minOpacity={0.75}>
                    <ListeningOrb
                      active={visible && (listening || typing)}
                      size={orbSize}
                    />
                  </VoiceModeFade>
                  <VoiceModeFade visible={!typing} minOpacity={0.3}>
                    <ListeningWave
                      active={visible && listening}
                      compact={compact}
                    />
                  </VoiceModeFade>
                  <View style={styles.modeCopy}>
                    <VoiceModeFade visible={!typing} style={styles.sceneLayer}>
                      <Text accessibilityRole="header" style={styles.title}>
                        {listening
                          ? 'Ouvindo você'
                          : voice.phase === 'starting'
                          ? 'Preparando microfone'
                          : voice.phase === 'stopping'
                          ? 'Finalizando transcrição'
                          : review
                          ? 'Transcrição pronta'
                          : 'Não foi possível ouvir'}
                      </Text>
                      <Text style={styles.timer}>{time}</Text>
                    </VoiceModeFade>
                    <VoiceModeFade visible={typing} style={styles.sceneLayer}>
                      <Text accessibilityRole="header" style={styles.title}>
                        Digite seu lançamento
                      </Text>
                      <Text style={styles.timer}>
                        Você revisa antes de enviar.
                      </Text>
                    </VoiceModeFade>
                  </View>
                </>
              }
            >
              <VoiceModeFade
                visible={!typing}
                interactive
                style={styles.sceneLayer}
              >
                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={styles.transcriptContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {review ? (
                    <View style={styles.transcriptEditor}>
                      <Text
                        accessible={false}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        aria-hidden
                        onLayout={event =>
                          setTranscriptHeight(
                            Math.max(
                              66,
                              Math.ceil(event.nativeEvent.layout.height) + 4,
                            ),
                          )
                        }
                        style={[
                          [
                            styles.transcript,
                            compact && styles.transcriptCompact,
                            styles.measurement,
                          ],
                          pointerEventsStyles.none,
                        ]}
                      >{`${voice.text}\u200b`}</Text>
                      <TextInput
                        {...inputTheme}
                        ref={input}
                        accessibilityLabel="Texto transcrito"
                        multiline
                        scrollEnabled={false}
                        value={voice.text}
                        onChangeText={text => {
                          setFeedback(null);
                          voice.setText(text);
                        }}
                        editable={!sending}
                        textAlignVertical="top"
                        style={[
                          styles.transcript,
                          styles.input,
                          compact && styles.transcriptCompact,
                          { height: transcriptHeight },
                        ]}
                      />
                    </View>
                  ) : (
                    <Text
                      accessibilityLiveRegion="polite"
                      accessibilityLabel={voice.text || undefined}
                      numberOfLines={3}
                      style={[
                        styles.transcript,
                        !voice.text && styles.placeholder,
                        compact && styles.transcriptCompact,
                      ]}
                    >
                      {liveText ||
                        (listening
                          ? 'Conte seu lançamento.\nVocê revisa antes de enviar.'
                          : failed
                          ? 'Você pode tentar novamente.'
                          : 'Sua fala aparecerá aqui.')}
                    </Text>
                  )}
                  <View style={review ? styles.reviewTools : undefined}>
                    {review && (
                      <>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Editar transcrição"
                          disabled={sending}
                          onPress={() => input.current?.focus()}
                          style={({ pressed }) => [
                            styles.editButton,
                            pressed && styles.iconPressed,
                          ]}
                        >
                          <Icon
                            name="edit"
                            size={18}
                            color={colors.secondary}
                          />
                          <Text style={styles.editLabel}>Editar texto</Text>
                        </Pressable>
                        {!feedback && (
                          <Text style={styles.notice}>
                            A análise começa após sua confirmação.
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                  {!!feedback && review && (
                    <VoiceAnalysisFeedback
                      feedback={feedback}
                      disabled={sending}
                      onEdit={() => input.current?.focus()}
                    />
                  )}
                  {!!voice.error && !review && (
                    <Text accessibilityRole="alert" style={styles.error}>
                      {voice.error}
                    </Text>
                  )}
                  {voice.phase === 'error' && !!voice.text.trim() && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Revisar texto capturado"
                      onPress={voice.review}
                      style={styles.recovery}
                    >
                      <Text style={styles.recoveryText}>
                        Revisar texto capturado
                      </Text>
                    </Pressable>
                  )}
                </ScrollView>
              </VoiceModeFade>
              <VoiceModeFade
                visible={typing && !!feedback}
                interactive
                style={styles.sceneLayer}
              >
                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={styles.transcriptContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {!!feedback && typing && (
                    <VoiceAnalysisFeedback
                      feedback={feedback}
                      source="text"
                      disabled={sending}
                      onEdit={focusTyped}
                    />
                  )}
                </ScrollView>
              </VoiceModeFade>
            </VoiceScene>
            <VoiceComposer
              expanded={typing}
              visible={visible}
              sending={sending}
              value={typedText}
              inputRef={typedInput}
              onChangeText={text => {
                setFeedback(null);
                setTypedText(text);
              }}
              onExpand={() => changeMode('text')}
              onExpanded={focusTyped}
              onConfirm={confirm}
              confirmLabel={reviewLabel}
              caption={
                review
                  ? sending
                    ? 'Analisando…'
                    : reviewLabel
                  : listening
                  ? 'Toque no microfone para parar e revisar'
                  : failed
                  ? 'Toque no microfone para tentar novamente'
                  : 'Aguarde o microfone'
              }
              restartControl={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Gravar novamente"
                  disabled={typing || busy}
                  onPress={restart}
                  hitSlop={4}
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed && styles.iconPressed,
                    busy && styles.disabled,
                  ]}
                >
                  <Icon name="restart" size={25} color={colors.text} />
                </Pressable>
              }
              microphone={
                <VoiceMicButton
                  active={visible && listening}
                  review={review}
                  label={typing ? 'Voltar ao microfone' : microphoneLabel}
                  disabled={busy || (review && !voice.text.trim())}
                  onPress={
                    typing
                      ? () => changeMode('voice')
                      : review
                      ? confirm
                      : voice.phase === 'error'
                      ? restart
                      : voice.stop
                  }
                />
              }
              cancelControl={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar microfone"
                  disabled={typing || sending}
                  onPress={close}
                  hitSlop={4}
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed && styles.iconPressed,
                    sending && styles.disabled,
                  ]}
                >
                  <Icon name="close" size={25} color={colors.text} />
                </Pressable>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </DrawerPanel>
    </DrawerModal>
  );
}
const createStyles = colors =>
  StyleSheet.create({
    drawer: { flex: 1, width: '100%' },
    keyboard: { flex: 1 },
    frame: {
      flex: 1,
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      paddingHorizontal: 24,
    },
    header: {
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      gap: 10,
    },
    headerMark: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCopy: { flex: 1 },
    modeCopy: { position: 'relative', width: '100%', height: 58 },
    sceneLayer: { ...StyleSheet.absoluteFill },
    headerTitle: {
      fontFamily: fontFamilyBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },
    headerSubtitle: {
      fontFamily,
      fontSize: 12,
      lineHeight: 18,
      color: colors.secondary,
    },
    scroll: { flex: 1 },
    transcriptContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 12,
      paddingBottom: 12,
    },
    title: {
      fontFamily: fontFamilyMedium,
      fontSize: 18,
      lineHeight: 26,
      color: colors.text,
      marginTop: 8,
      textAlign: 'center',
    },
    timer: {
      fontFamily,
      fontSize: 13,
      color: colors.secondary,
      marginTop: 4,
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
    },
    transcript: {
      fontFamily: fontFamilyMedium,
      fontSize: 24,
      lineHeight: 33,
      letterSpacing: -0.5,
      color: colors.text,
      textAlign: 'center',
      width: '100%',
    },
    placeholder: { color: colors.secondary, fontSize: 21, lineHeight: 30 },
    transcriptCompact: { fontSize: 20, lineHeight: 27 },
    error: {
      fontFamily,
      fontSize: 14,
      lineHeight: 21,
      color: colors.error,
      textAlign: 'center',
      marginTop: 20,
    },
    input: {
      padding: 0,
      minHeight: 66,
      borderWidth: 0,
      backgroundColor: 'transparent',
      ...(Platform.OS === 'web'
        ? { outlineWidth: 0, outlineStyle: 'none' }
        : {}),
    },
    transcriptEditor: { width: '100%', position: 'relative' },
    measurement: { position: 'absolute', top: 0, left: 0, opacity: 0 },
    reviewTools: { minHeight: 84, alignItems: 'center', width: '100%' },
    editButton: {
      minHeight: 48,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderRadius: 24,
    },
    editLabel: { fontFamily, fontSize: 13, color: colors.secondary },
    notice: {
      fontFamily,
      fontSize: 12,
      lineHeight: 18,
      color: colors.secondary,
      marginTop: 4,
    },
    iconButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconPressed: {
      backgroundColor: colors.surfaceMuted,
      transform: [{ scale: 0.96 }],
    },
    disabled: { opacity: 0.45 },
    recovery: { padding: 12, marginTop: 12 },
    recoveryText: {
      fontFamily: fontFamilyMedium,
      fontSize: 14,
      color: colors.primary,
    },
  });
