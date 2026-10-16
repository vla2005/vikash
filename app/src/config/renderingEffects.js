import { Platform } from 'react-native';

// iPhone usa blur/Liquid Glass; web usa blur CSS equivalente.
// Android mantém superfícies sólidas de alto contraste sem transparência sobreposta
// para eliminar overdraw na GPU e garantir 60-120 FPS constantes na rolagem.
export const renderingEffects = {
  backgroundBlur: Platform.OS === 'ios' || Platform.OS === 'web',
  cardReflections: Platform.OS !== 'android',
  cardShadows: Platform.OS !== 'android',
  ambientLight: true,
  ambientMotion: Platform.OS !== 'android',
  cardTransparency: Platform.OS !== 'android',
  dockBlur: Platform.OS === 'ios' || Platform.OS === 'web',
  edgeBlur: Platform.OS === 'ios' || Platform.OS === 'web',
};
