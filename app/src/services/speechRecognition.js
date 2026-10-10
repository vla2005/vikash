import { Platform } from 'react-native';

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
      const android = Platform.OS === 'android';
      const service = android ? androidRecognitionService(module) : undefined;
      if (!service && !module.isRecognitionAvailable()) { callbacks.onError('service-not-allowed'); return; }
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
    dispose() { cancelled = true; listeners.forEach(listener => listener.remove()); module.abort(); },
  };
}
