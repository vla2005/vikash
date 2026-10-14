import { Platform } from 'react-native';

// iPhone usa blur/Liquid Glass; Android mantém o material sem desfoque.
// A web permanece sem desfoque durante a comparação de desempenho.
export const renderingEffects = {
  backgroundBlur: Platform.OS === 'ios',
};
