// O tema nativo é aplicado pelos componentes e pela StatusBar do App.
import { useEffect } from 'react';
import * as SystemUI from 'expo-system-ui';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeBrowserSync() {
  const { colors } = useTheme();
  useEffect(() => {
    // A View raiz nativa também acompanha a preferência escolhida no aplicativo.
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);
  return null;
}
