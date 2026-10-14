import { Platform } from 'react-native';

// iPhone usa blur/Liquid Glass; web usa blur CSS equivalente.
// Android mantém o material sem desfoque para preservar a fluidez.
export const renderingEffects = {
  backgroundBlur: Platform.OS === 'ios' || Platform.OS === 'web',
  // Teste temporário no Android: reflexos dos cards desativados.
  cardReflections: Platform.OS !== 'android',
  cardShadows: true,
  ambientLight: true,
  cardTransparency: true,
};
