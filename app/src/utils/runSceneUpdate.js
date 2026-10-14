import { startTransition } from 'react';
import { Platform } from 'react-native';

// No Android, feedback de toque tem prioridade sobre montar a próxima tela.
// Nenhum timer/delay artificial; React pode interromper e retomar o render.
export default function runSceneUpdate(update) {
  if (Platform.OS === 'android') { startTransition(update); }
  else { update(); }
}
