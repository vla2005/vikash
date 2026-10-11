/* eslint-env browser */
import { useLayoutEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeBrowserSync() {
  const { colors, scheme } = useTheme();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = scheme;
    root.style.backgroundColor = colors.background;
    root.style.setProperty('--vikash-primary', colors.primary);
    root.style.setProperty('--vikash-selection', colors.primarySoft);
    root.style.setProperty('--vikash-text', colors.text);
    root.style.setProperty('--vikash-scrollbar', colors.handle);
    root.style.setProperty('--vikash-background', colors.background);
  }, [colors, scheme]);
  return null;
}
