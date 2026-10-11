import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { themes } from '../theme';
import { categoryPalettes } from '../theme/categoryPalette';
import { readAppearance, writeAppearance } from '../services/appearanceStorage';

export const appearanceOptions = [
  {
    value: 'system',
    label: 'Sistema',
    description: 'Acompanhar o tema do aparelho',
    icon: 'device',
  },
  {
    value: 'light',
    label: 'Claro',
    description: 'Usar sempre o modo claro',
    icon: 'sun',
  },
  {
    value: 'dark',
    label: 'Escuro',
    description: 'Usar sempre o modo escuro',
    icon: 'moon',
  },
];
const validPreference = value =>
  appearanceOptions.some(option => option.value === value);
const ThemeContext = createContext({
  ...themes.light,
  categoryColors: categoryPalettes.light,
  preference: 'system',
  ready: true,
  setPreference: async () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState('system');
  const [ready, setReady] = useState(false);
  const saving = useRef(false);
  const scheme =
    preference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  useEffect(() => {
    let active = true;
    readAppearance()
      .then(saved => {
        if (active && validPreference(saved)) {
          setPreferenceState(saved);
        }
      })
      .catch(() => {
        // Sem acesso ao armazenamento, o tema do sistema continua disponível.
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
    if (!validPreference(next)) {
      throw new Error('Escolha Sistema, Claro ou Escuro.');
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
      ...themes[scheme],
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
            { backgroundColor: themes[scheme].colors.background },
          ]}
        />
      )}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export function useInputTheme() {
  const { colors, scheme } = useTheme();
  return {
    placeholderTextColor: colors.placeholder,
    selectionColor: colors.primary,
    cursorColor: colors.primary,
    keyboardAppearance: scheme,
  };
}
const styles = StyleSheet.create({ loading: { flex: 1 } });

// Cada componente mantém seus estilos; só as cores vêm do tema compartilhado.
export function useThemeStyles(createStyles) {
  const { colors: palette, typography: type } = useTheme();
  return useMemo(
    () => createStyles(palette, type),
    [createStyles, palette, type],
  );
}
