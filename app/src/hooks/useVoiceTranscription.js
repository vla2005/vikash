import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { createSpeechRecognition } from '../services/speechRecognition';

const messages = {
  'not-allowed': 'Permita o acesso ao microfone e ao reconhecimento de voz para transcrever.',
  'service-not-allowed': 'O reconhecimento de voz não está disponível neste dispositivo.',
  'audio-capture': 'Não foi possível acessar o microfone. Confira se outro app está usando ele.',
  'no-speech': 'Não ouvimos nenhuma fala. Tente gravar novamente.',
  network: 'A transcrição perdeu a conexão. Confira a internet e tente novamente.',
  'language-not-supported': 'O reconhecimento em português não está disponível neste dispositivo.',
};

export default function useVoiceTranscription(visible) {
  const [phase, setPhase] = useState('starting');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const capture = useRef(null);
  const generation = useRef(0);
  const currentText = useRef('');
  const currentPhase = useRef('starting');
  const stopTimer = useRef(null);
  const changePhase = useCallback(value => { currentPhase.current = value; setPhase(value); }, []);
  const cleanup = useCallback(() => {
    generation.current++;
    clearTimeout(stopTimer.current);
    capture.current?.dispose();
    capture.current = null;
  }, []);
  const finish = useCallback(() => {
    clearTimeout(stopTimer.current);
    if (currentText.current.trim()) { changePhase('review'); }
    else { setError(messages['no-speech']); changePhase('error'); }
  }, [changePhase]);
  const start = useCallback(async () => {
    cleanup();
    const id = generation.current;
    currentText.current = '';
    setText(''); setError(''); setSeconds(0); changePhase('starting');
    const active = () => generation.current === id;
    try {
      const instance = createSpeechRecognition({
        onStart: () => { if (active()) { changePhase('listening'); } },
        onResult: value => {
          if (!active() || !['starting', 'listening', 'stopping'].includes(currentPhase.current)) { return; }
          currentText.current = value; setText(value);
        },
        onEnd: () => { if (active() && currentPhase.current !== 'error') { finish(); } },
        onError: code => {
          if (!active()) { return; }
          if (currentPhase.current === 'stopping' && ['aborted', 'client', 'no-speech'].includes(code)) { finish(); return; }
          setError(messages[code] || 'A captura de voz foi interrompida. Tente novamente.');
          changePhase('error');
        },
      });
      capture.current = instance;
      await instance.start();
    } catch (failure) {
      if (active()) { setError(failure.message || 'Não foi possível iniciar a transcrição.'); changePhase('error'); }
    }
  }, [cleanup, changePhase, finish]);
  const stop = useCallback(() => {
    if (currentPhase.current !== 'listening') { return; }
    changePhase('stopping');
    stopTimer.current = setTimeout(() => { finish(); cleanup(); }, 2500);
    try { capture.current?.stop(); } catch { finish(); cleanup(); }
  }, [changePhase, finish, cleanup]);
  useEffect(() => { if (visible) { start(); } return cleanup; }, [visible, start, cleanup]);
  useEffect(() => {
    if (phase !== 'listening') { return; }
    const timer = setInterval(() => setSeconds(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);
  useEffect(() => {
    if (!visible) { return; }
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background' && ['starting', 'listening', 'stopping'].includes(currentPhase.current)) { cleanup(); finish(); }
    });
    return () => subscription.remove();
  }, [visible, cleanup, finish]);
  return { phase, text, setText, error, seconds, start, stop, cancel: cleanup, review: () => { cleanup(); changePhase('review'); } };
}
