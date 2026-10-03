export function createSpeechRecognition(callbacks) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { throw new Error('Este navegador não oferece transcrição de voz. Abra no Chrome ou Edge.'); }
  const recognition = new Recognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onstart = callbacks.onStart;
  recognition.onend = callbacks.onEnd;
  recognition.onerror = event => callbacks.onError(event.error);
  recognition.onresult = event => {
    const parts = [];
    for (let index = 0; index < event.results.length; index++) { parts.push(event.results[index][0].transcript); }
    callbacks.onResult(parts.join(' ').trim());
  };
  return {
    start() { recognition.start(); },
    stop() { recognition.stop(); },
    dispose() { recognition.onstart = null; recognition.onend = null; recognition.onerror = null; recognition.onresult = null; recognition.abort(); },
  };
}
