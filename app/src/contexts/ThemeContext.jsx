import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { lightThemeEnabled } from '../config/appearance';
import { categoryPalettes } from '../theme/categoryPalette';
import { readAppearance, writeAppearance } from '../services/appearanceStorage';
import { silverThemes } from '../theme/silver';

const validPreference = value => value === 'light' || value === 'dark';
const ThemeContext = createContext({
  ...silverThemes.dark,
  categoryColors: categoryPalettes.dark,
  preference: 'dark',
  ready: true,
  setPreference: async () => {},
});

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState('dark');
  const [ready, setReady] = useState(!lightThemeEnabled);
  const saving = useRef(false);
  const scheme = lightThemeEnabled ? preference : 'dark';

  useEffect(() => {
    if (!lightThemeEnabled) return;
    let active = true;
    readAppearance()
      .then(saved => {
        if (active && validPreference(saved)) {
          setPreferenceState(saved);
        }
      })
      .catch(() => {
        // Sem acesso ao armazenamento, mantém a aparência escura padrão.
      })
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback(async next => {
    if (!lightThemeEnabled) return;
    if (!validPreference(next)) {
      throw new Error('Escolha Claro ou Escuro.');
    }
    if (saving.current) {
      return;
    }
    saving.current = true;
    try {
      await writeAppearance(next);
      setPreferenceState(next);
    } catch {
      throw new Error('Não foi possível salvar a aparência. Tente novamente.');
    } finally {
      saving.current = false;
    }
  }, []);

  const value = useMemo(
    () => ({
      ...silverThemes[scheme],
      categoryColors: categoryPalettes[scheme],
      preference,
      ready,
      setPreference,
    }),
    [scheme, preference, ready, setPreference],
  );
  return (
    <ThemeContext.Provider value={value}>
      {ready ? (
        children
      ) : (
        <View
          style={[
            styles.loading,
            { backgroundColor: silverThemes[scheme].colors.background },
          ]}
        />
      )}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
// A mesma identidade visual acompanha a preferência, sem remontar as telas.
export function ThemeVariant({ children, variant = 'silver' }) {
  const parent = useTheme();
  const value = useMemo(
    () =>
      variant === 'silver'
        ? { ...parent, ...silverThemes[parent.scheme] }
        : parent,
    [parent, variant],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
export function useInputTheme() {
  const { colors, scheme } = useTheme();
  return useMemo(() => ({
    placeholderTextColor: colors.placeholder,
    selectionColor: colors.primary,
    cursorColor: colors.primary,
    keyboardAppearance: scheme,
  }), [colors.placeholder, colors.primary, scheme]);
}
export const useThemeTokens = () => useTheme().effects;
const styles = StyleSheet.create({ loading: { flex: 1 } });

// Cada componente mantém seus estilos; só as cores vêm do tema compartilhado.
export function useThemeStyles(createStyles) {
  const { colors: palette, typography: type, effects } = useTheme();
  return useMemo(
    () => createStyles(palette, type, effects),
    [createStyles, palette, type, effects],
  );
}
