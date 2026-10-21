import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  OnboardingProvider,
  useOnboarding,
} from '../contexts/OnboardingContext';
import {
  ThemeProvider,
  ThemeVariant,
  useTheme,
} from '../contexts/ThemeContext';
import useAppFonts from '../hooks/useAppFonts';
import useVoiceTranscription from '../hooks/useVoiceTranscription';
import ListeningOrb from '../components/ListeningOrb';
import PrimaryButton from '../components/PrimaryButton';
import InlineNotice from '../components/InlineNotice';
import Icon from '../components/Icon';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';
import { voiceEntryNative } from '../services/voiceEntryNative';
import {
  previewVoiceEntry,
  confirmVoiceEntry,
  loadPendingVoiceEntry,
  storePendingVoiceEntry,
  clearPendingVoiceEntry,
  loadVoiceConsent,
  acceptVoiceConsent,
} from '../services/voiceEntry';
import { sessionProfileId } from '../utils/sessionProfile';
import { entryFields, reviewedAnalysis } from '../utils/voiceEntry';
import { notifyFinancialChange } from '../services/financialChanges';

export default function VoiceEntryRoot() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemeVariant>
          <OnboardingProvider>
            <VoiceEntry />
          </OnboardingProvider>
        </ThemeVariant>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
function VoiceEntry() {
  const auth = useOnboarding(),
    { colors } = useTheme(),
    insets = useSafeAreaInsets();
  const fontsReady = useAppFonts();
  const [phase, setPhase] = useState('loading'),
    [consent, setConsent] = useState(false);
  const [text, setText] = useState(''),
    [error, setError] = useState(''),
    [analysis, setAnalysis] = useState(null);
  const [fields, setFields] = useState(null);
  const attempted = useRef(null);
  const [pending, setPending] = useState(null),
    [reduceMotion, setReduceMotion] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  const native = voiceEntryNative();
  const [remote, setRemote] = useState(false);
  const recognitionOptions = useMemo(
    () => ({ preferOnDevice: !remote }),
    [remote],
  );
  const voice = useVoiceTranscription(
    phase === 'capture' && consent,
    recognitionOptions,
  );
  const locked = useRef(false),
    generation = useRef(0),
    request = useRef(null),
    successTimer = useRef(null);
  const mounted = useRef(true);
  const fade = useSharedValue(0);
  const reveal = useSharedValue(0);
  const closeTimer = useRef(null);
  const token = auth?.session?.accessToken,
    profileId = sessionProfileId(auth?.session);
  const busy = phase === 'saving';
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    const state = AppState.addEventListener('change', value => {
      setForeground(value === 'active');
      if (value === 'background') {
        voice.cancel();
        request.current?.abort();
      }
    });
    return () => {
      mounted.current = false;
      request.current?.abort();
      clearTimeout(successTimer.current);
      clearTimeout(closeTimer.current);
      motion.remove();
      state.remove();
    };
    // Activity destruction owns final cleanup; no audio survives this surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    fade.set(
      reduceMotion
        ? 1
        : withTiming(1, {
            duration: 220,
            easing: Easing.bezier(0.23, 1, 0.32, 1),
            reduceMotion: ReduceMotion.System,
          }),
    );
  }, [fade, reduceMotion]);
  useEffect(() => {
    const id = ++generation.current;
    request.current?.abort();
    setConsent(false);
    attempted.current = null;
    setAnalysis(null);
    setFields(null);
    setPending(null);
    setError('');
    if (!auth?.ready || !fontsReady) {
      setPhase('loading');
      return;
    }
    if (auth.restoreError || !token || !profileId) {
      setPhase('session');
      return;
    }
    setPhase('loading');
    Promise.all([loadPendingVoiceEntry(profileId), loadVoiceConsent(profileId)])
      .then(([saved, accepted]) => {
        if (!mounted.current || generation.current !== id) return;
        if (saved) {
          setPending(saved);
          setText(saved.transcription);
          setAnalysis(saved.analysis);
          setFields(entryFields(saved.analysis));
          setPhase('pending');
        } else if (accepted) {
          setConsent(true);
          setPhase('capture');
        } else setPhase('consent');
      })
      .catch(() => {
        if (generation.current === id) {
          setPhase('session');
          setError(
            'Não foi possível acessar o armazenamento seguro. Abra o ViKash e tente novamente.',
          );
        }
      });
    // Rotating a token for the same user must not discard an in-progress confirmation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.ready, auth?.restoreError, profileId, fontsReady]); // token rotation keeps the draft and request id
  useEffect(() => {
    if (phase === 'capture' && voice.phase === 'review') {
      setText(voice.text);
      setPhase('transcript');
    }
  }, [phase, voice.phase, voice.text]);

  useEffect(() => {
    if (
      phase === 'transcript' &&
      !error &&
      text.trim() &&
      attempted.current !== text
    ) {
      attempted.current = text;
      analyze();
    }
    // Each completed transcription is analyzed once; confirmation remains explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, text, error]);
  useEffect(() => {
    if (phase !== 'capture' || voice.phase !== 'listening') return;
    const timer = setTimeout(voice.stop, 45000);
    return () => clearTimeout(timer);
  }, [phase, voice.phase, voice.stop]);
  async function agree() {
    try {
      await acceptVoiceConsent(profileId);
      setConsent(true);
      start();
    } catch {
      setError(
        'Não foi possível salvar sua escolha com segurança. Tente novamente.',
      );
    }
  }
  function close() {
    if (phase === 'saving') return;
    voice.cancel();
    request.current?.abort();
    generation.current++;
    Keyboard.dismiss();
    if (reduceMotion) native?.finish();
    else {
      fade.set(
        withTiming(0, { duration: 160, reduceMotion: ReduceMotion.System }),
      );
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => native?.finish(), 160);
    }
  }
  function start() {
    if (phase === 'saving' || pending) return;
    voice.cancel();
    request.current?.abort();
    generation.current++;
    locked.current = false;
    attempted.current = null;
    setError('');
    setText('');
    setAnalysis(null);
    setFields(null);
    if (phase === 'capture' && voice.phase === 'error' && !remote)
      setRemote(true);
    else if (phase === 'capture') voice.start();
    else setPhase('capture');
  }
  async function analyze() {
    if (locked.current || !text.trim()) return;
    locked.current = true;
    setError('');
    setPhase('analyzing');
    voice.cancel();
    Keyboard.dismiss();
    const id = generation.current,
      controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const result = await previewVoiceEntry(text, token, controller.signal);
      if (!mounted.current || generation.current !== id) return;
      if (result.type && !['EXPENSE', 'INCOME'].includes(result.type))
        throw new Error(
          'Use o app para transferências ou pagamentos de fatura. Este atalho registra receitas e despesas.',
        );
      if (result.missingFields?.includes('multipleTransactions'))
        throw new Error('Diga apenas um lançamento de cada vez.');
      if (result.missingFields?.length)
        throw new Error('Faltam dados. Regrave ou abra o app para completar.');
      const ready = entryFields(result);
      reviewedAnalysis(ready, result);
      setAnalysis(result);
      setFields(ready);
      setPhase('review');
    } catch (failure) {
      if (mounted.current && generation.current === id) {
        setError(
          failure.name === 'AbortError'
            ? 'A análise foi interrompida. Confira a conexão e tente novamente.'
            : failure.message,
        );
        setPhase(
          [401, 403].includes(failure.status) ? 'session' : 'transcript',
        );
      }
    } finally {
      clearTimeout(timer);
      if (generation.current === id) locked.current = false;
    }
  }
  async function save() {
    if (locked.current) return;
    locked.current = true;
    setError('');
    const id = generation.current,
      controller = new AbortController();
    request.current = controller;
    let payload = pending,
      timer;
    try {
      if (!payload) {
        const checked = reviewedAnalysis(fields, analysis);
        payload = {
          requestId: await native.newRequestId(),
          transcription: text,
          analysis: checked,
        };
        // Stored before sending: loss of response or process death retries the exact same request.
        await storePendingVoiceEntry(profileId, payload);
        if (!mounted.current || generation.current !== id) return;
        setPending(payload);
      }
      setPhase('saving');
      Keyboard.dismiss();
      timer = setTimeout(() => controller.abort(), 20000);
      await confirmVoiceEntry(payload, token, controller.signal);
      // Success is acknowledged only after the server commits receipt + financial record.
      notifyFinancialChange();
      try {
        await clearPendingVoiceEntry(profileId);
      } catch {
        /* Retrying this receipt remains safe. */
      }
      if (!mounted.current || generation.current !== id) return;
      setPhase('success');
      successTimer.current = setTimeout(() => native.finish(), 1200);
    } catch (failure) {
      if (!mounted.current || generation.current !== id) return;
      const rejected = [400, 409, 422].includes(failure.status);
      if (rejected) {
        try {
          await clearPendingVoiceEntry(profileId);
        } catch {
          setError(
            'Não foi possível atualizar a confirmação no armazenamento seguro. Tente verificar novamente.',
          );
          setPhase('pending');
          return;
        }
        setPending(null);
      }
      setError(
        failure.name === 'AbortError'
          ? 'Não recebemos a confirmação. Toque em Verificar registro para consultar a mesma operação sem duplicar.'
          : failure.message || 'Não foi possível confirmar o registro.',
      );
      if (rejected) setFields(null);
      setPhase(
        [401, 403].includes(failure.status)
          ? 'session'
          : payload && !rejected
          ? 'pending'
          : 'transcript',
      );
    } finally {
      clearTimeout(timer);
      if (generation.current === id) locked.current = false;
    }
  }
  const showingText =
    !!text &&
    !['capture', 'loading', 'consent', 'session', 'success'].includes(phase);
  const failedCapture = phase === 'capture' && voice.phase === 'error';
  useEffect(() => {
    const destination =
      showingText || failedCapture || phase === 'success' ? 1 : 0;
    reveal.set(
      reduceMotion
        ? destination
        : withTiming(destination, {
            duration: 280,
            easing: Easing.bezier(0.23, 1, 0.32, 1),
            reduceMotion: ReduceMotion.System,
          }),
    );
  }, [showingText, failedCapture, phase, reduceMotion, reveal]);
  const surfaceStyle = useAnimatedStyle(
    () => ({ opacity: fade.get() }),
    [fade],
  );
  const orbStyle = useAnimatedStyle(
    () => ({
      transform: [
        { translateY: -28 - 177 * reveal.get() },
        { scale: 1 - 0.26 * reveal.get() },
      ],
    }),
    [reveal],
  );
  const responseStyle = useAnimatedStyle(
    () => ({
      opacity: reveal.get(),
      transform: [{ translateY: 12 * (1 - reveal.get()) }],
    }),
    [reveal],
  );
  const needsSetup = ['consent', 'session'].includes(phase);
  const mainError = error || (failedCapture ? voice.error : '');
  function openApp() {
    voice.cancel();
    request.current?.abort();
    generation.current++;
    Keyboard.dismiss();
    native?.openApp();
  }
  return (
    <Animated.View style={[styles.root, surfaceStyle]}>
      <View
        style={StyleSheet.absoluteFill}
        accessible={false}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="voice-entry-shade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#030508" stopOpacity="0.58" />
              <Stop offset="0.35" stopColor="#030508" stopOpacity="0.79" />
              <Stop offset="1" stopColor="#05060A" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#voice-entry-shade)" />
        </Svg>
      </View>
      <Pressable
        accessibilityLabel="Fechar registro por voz"
        accessibilityRole="button"
        disabled={busy}
        style={StyleSheet.absoluteFill}
        onPress={close}
      />
      <View
        style={[
          styles.surface,
          {
            paddingBottom: Math.max(insets.bottom + 18, 35),
            paddingTop: Math.max(insets.top, 16),
          },
        ]}
      >
        {needsSetup ? (
          <View style={styles.setup}>
            <Text style={[styles.setupTitle, { color: colors.text }]}>
              {phase === 'consent' ? 'Registrar por voz' : 'Entre na sua conta'}
            </Text>
            <Text style={[styles.setupCopy, { color: colors.secondary }]}>
              {phase === 'consent'
                ? 'Sua fala será transcrita pelo serviço de voz do celular e o texto será analisado pelo Gemini. O serviço de voz pode processar o áudio online. Você confirma antes de salvar.'
                : auth?.restoreError ||
                  'Abra o ViKash para entrar. Depois, toque novamente no atalho.'}
            </Text>
            {!!mainError && <InlineNotice error message={mainError} />}
            {phase === 'consent' && (
              <PrimaryButton
                title="Concordar e começar"
                icon="mic"
                onPress={agree}
              />
            )}
            {phase === 'session' && !!auth?.restoreError && (
              <PrimaryButton
                title="Verificar sessão novamente"
                onPress={auth.retryRestore}
              />
            )}
            <CompactAction
              title="Abrir app"
              icon="arrow"
              small
              onPress={openApp}
            />
          </View>
        ) : (
          <View style={styles.stage}>
            <Animated.View style={[styles.orb, orbStyle]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Encerrar gravação"
                disabled={phase !== 'capture' || voice.phase !== 'listening'}
                onPress={voice.stop}
              >
                <ListeningOrb
                  active={foreground && !reduceMotion && phase !== 'success'}
                  size={232}
                />
              </Pressable>
            </Animated.View>
            {(showingText || failedCapture) && (
              <Animated.View
                style={[styles.response, showingText && responseStyle]}
              >
                {showingText && (
                  <ScrollView
                    style={styles.transcriptScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text
                      accessibilityLabel="Transcrição"
                      accessibilityLiveRegion="polite"
                      style={[styles.transcript, { color: colors.text }]}
                    >
                      {text}
                    </Text>
                  </ScrollView>
                )}
                {!!mainError && <InlineNotice error message={mainError} />}
                {phase === 'pending' && !mainError && (
                  <Text style={[styles.pending, { color: colors.secondary }]}>
                    Verifique a tentativa anterior para evitar duplicidade.
                  </Text>
                )}
                <View style={styles.actions}>
                  <CompactAction
                    title={
                      phase === 'pending' ? 'Verificar registro' : 'Confirmar'
                    }
                    icon="check"
                    loading={['analyzing', 'saving'].includes(phase)}
                    disabled={
                      !['review', 'pending'].includes(phase) ||
                      (!!mainError && phase !== 'pending')
                    }
                    onPress={save}
                  />
                  <CompactAction
                    title="Regravar"
                    icon="restart"
                    outlined
                    disabled={busy || phase === 'pending'}
                    onPress={start}
                  />
                </View>
                <CompactAction
                  title="Abrir app"
                  icon="arrow"
                  small
                  disabled={busy}
                  onPress={openApp}
                />
              </Animated.View>
            )}
            {phase === 'success' && (
              <View
                accessibilityRole="alert"
                accessibilityLabel="Registro confirmado"
                style={styles.success}
              >
                <Icon name="check" size={32} color={colors.brandPrimary} />
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function CompactAction({
  title,
  icon,
  onPress,
  disabled,
  loading,
  outlined,
  small,
}) {
  const { colors } = useTheme();
  const unavailable = disabled || loading;
  const foreground = small
    ? colors.secondary
    : outlined
    ? colors.text
    : colors.onBrand;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!unavailable, busy: !!loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        small ? styles.smallAction : styles.mainAction,
        !small && {
          backgroundColor: outlined
            ? 'rgba(255,255,255,0.04)'
            : colors.brandPrimary,
          borderColor: outlined ? 'rgba(255,255,255,0.22)' : 'transparent',
        },
        unavailable && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        <Icon name={icon} size={small ? 16 : 20} color={foreground} />
      )}
      <Text
        style={[
          styles.actionText,
          small && styles.smallText,
          { color: foreground },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  surface: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  stage: { height: 440, justifyContent: 'flex-end', alignItems: 'center' },
  orb: {
    position: 'absolute',
    bottom: 12,
    width: 232,
    height: 232,
    alignItems: 'center',
  },
  response: { width: '100%', alignItems: 'center' },
  transcriptScroll: {
    maxHeight: 130,
    width: '100%',
    marginBottom: 28,
    minHeight: 95,
  },
  transcript: {
    fontFamily: fontFamilyMedium,
    fontSize: 21,
    lineHeight: 31,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
  },
  mainAction: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  smallAction: {
    minHeight: 48,
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'center',
  },
  actionText: { fontFamily: fontFamilyBold, fontSize: 14, textAlign: 'center' },
  smallText: { fontFamily: fontFamilyMedium, fontSize: 12 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  setup: { paddingBottom: 12, gap: 20 },
  setupTitle: {
    fontFamily: fontFamilyBold,
    fontSize: 23,
    lineHeight: 30,
    textAlign: 'center',
  },
  setupCopy: { fontFamily, fontSize: 14, lineHeight: 22 },
  pending: {
    fontFamily,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  success: {
    position: 'absolute',
    bottom: 70,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
