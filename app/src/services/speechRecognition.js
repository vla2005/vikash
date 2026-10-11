import { AppState, Platform } from 'react-native';

function androidRecognitionService(module) {
  const services = module.getSpeechRecognitionServices();
  const defaultService = module.getDefaultRecognitionService().packageName;
  if (services.includes(defaultService)) { return defaultService; }
  const googleServices = ['com.google.android.tts', 'com.google.android.googlequicksearchbox'];
  return googleServices.find(service => services.includes(service)) || services[0];
}

export function createSpeechRecognition(callbacks) {
  // Não importar o pacote antes desta verificação: ele exige o módulo ao carregar.
  const { requireOptionalNativeModule } = require('expo');
  const module = requireOptionalNativeModule('ExpoSpeechRecognition');
  if (!module) {
    throw new Error('A transcrição no celular precisa de uma build própria do Vikash. Ela não está disponível no Expo Go.');
  }
  let cancelled = false;
  let recognitionStarted = false;
  let finishForegroundWait = null;
  let finalText = '';

  function waitForForeground() {
    if (AppState.currentState !== 'background') { return Promise.resolve(true); }
    // A resposta da permissão pode chegar antes de a atividade voltar ao primeiro plano.
    return new Promise(resolve => {
      let subscription;
      let timer;
      const finish = ready => {
        clearTimeout(timer);
        subscription?.remove();
        finishForegroundWait = null;
        resolve(ready);
      };
      finishForegroundWait = finish;
      subscription = AppState.addEventListener('change', state => {
        if (state === 'active') { finish(true); }
      });
      timer = setTimeout(() => finish(false), 10000);
    });
  }

  const listeners = [
    module.addListener('start', () => { if (!cancelled && recognitionStarted) { callbacks.onStart(); } }),
    module.addListener('end', () => { if (!cancelled && recognitionStarted) { callbacks.onEnd(); } }),
    module.addListener('error', event => { if (!cancelled && recognitionStarted) { callbacks.onError(event.error); } }),
    module.addListener('result', event => {
      if (cancelled || !recognitionStarted) { return; }
      const text = event.results[0]?.transcript || '';
      const complete = Platform.OS === 'android' ? [finalText, text].filter(Boolean).join(' ') : text;
      callbacks.onResult(complete);
      if (event.isFinal && Platform.OS === 'android') { finalText = complete; }
    }),
  ];
  return {
    async start() {
      let permission = await module.getPermissionsAsync();
      if (cancelled) { return; }
      if (!permission.granted) { permission = await module.requestPermissionsAsync(); }
      if (cancelled) { return; }
      if (!permission.granted) { callbacks.onError('not-allowed'); return; }
      const foreground = await waitForForeground();
      if (cancelled) { return; }
      if (!foreground) { callbacks.onError('background'); return; }
      const android = Platform.OS === 'android';
      const service = android ? androidRecognitionService(module) : undefined;
      if (!service && !module.isRecognitionAvailable()) { callbacks.onError('service-not-allowed'); return; }
      recognitionStarted = true;
      module.start({
        lang: 'pt-BR', interimResults: true, maxAlternatives: 1,
        // No Android, o serviço captura o microfone diretamente e finaliza após a fala.
        // O modo contínuo usa um fluxo de áudio que nem todos os serviços aceitam.
        continuous: !android, addsPunctuation: !android,
        recordingOptions: { persist: false },
        ...(service ? { androidRecognitionServicePackage: service } : {}),
      });
    },
    stop() { module.stop(); },
    dispose() {
      cancelled = true;
      finishForegroundWait?.(false);
      listeners.forEach(listener => listener.remove());
      if (recognitionStarted) { module.abort(); }
    },
  };
}
