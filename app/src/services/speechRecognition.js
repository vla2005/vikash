import { Platform } from 'react-native';

export function createSpeechRecognition(callbacks) {
  // Não importar o pacote antes desta verificação: ele exige o módulo ao carregar.
  const { requireOptionalNativeModule } = require('expo');
  const module = requireOptionalNativeModule('ExpoSpeechRecognition');
  if (!module) {
    throw new Error('A transcrição no celular precisa de uma build própria do Vikash. Ela não está disponível no Expo Go.');
  }
  let cancelled = false;
  let finalText = '';
  const listeners = [
    module.addListener('start', callbacks.onStart),
    module.addListener('end', callbacks.onEnd),
    module.addListener('error', event => callbacks.onError(event.error)),
    module.addListener('result', event => {
      const text = event.results[0]?.transcript || '';
      const complete = Platform.OS === 'android' ? [finalText, text].filter(Boolean).join(' ') : text;
      callbacks.onResult(complete);
      if (event.isFinal && Platform.OS === 'android') { finalText = complete; }
    }),
  ];
  return {
    async start() {
      const permission = await module.requestPermissionsAsync();
      if (cancelled) { return; }
      if (!permission.granted) { callbacks.onError('not-allowed'); return; }
      if (!module.isRecognitionAvailable()) { callbacks.onError('service-not-allowed'); return; }
      module.start({ lang: 'pt-BR', interimResults: true, continuous: true, maxAlternatives: 1, addsPunctuation: true, recordingOptions: { persist: false } });
    },
    stop() { module.stop(); },
    dispose() { cancelled = true; listeners.forEach(listener => listener.remove()); module.abort(); },
  };
}
