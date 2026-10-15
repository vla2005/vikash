// Exercita também o suporte preservado para futura reativação do tema claro.
jest.mock('../src/config/appearance', () => ({ lightThemeEnabled: true }));
import React, { useState } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput, StyleSheet, Switch } from 'react-native';
import {
  ThemeProvider,
  ThemeVariant,
  useTheme,
  useThemeStyles,
} from '../src/contexts/ThemeContext';
import AppearanceSettings from '../src/components/AppearanceSettings';
import FormField from '../src/components/FormField';
import {
  readAppearance,
  writeAppearance,
} from '../src/services/appearanceStorage';
import { themes } from '../src/theme';
import { silverThemes } from '../src/theme/silver';
import { categoryPalettes } from '../src/theme/categoryPalette';

jest.mock('../src/services/appearanceStorage', () => ({
  readAppearance: jest.fn(),
  writeAppearance: jest.fn(),
}));
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockSystemScheme,
}));
jest.mock('../src/components/Icon', () => 'Icon');
let mockSystemScheme = 'light';
let current;
let renderer;
const createStyles = colors =>
  StyleSheet.create({ text: { color: colors.text } });
function Probe() {
  current = useTheme();
  const styles = useThemeStyles(createStyles);
  const [name, setName] = useState('');
  return (
    <>
      <Text testID="theme-text" style={styles.text}>
        {current.scheme}
      </Text>
      <FormField label="Nome" value={name} onChangeText={setName} />
      <AppearanceSettings />
    </>
  );
}
const tree = () => (
  <ThemeProvider>
    <ThemeVariant>
      <Probe />
    </ThemeVariant>
  </ThemeProvider>
);
const mount = async () =>
  act(async () => {
    renderer = TestRenderer.create(tree());
  });
const toggle = () => renderer.root.findByType(Switch);
beforeEach(() => {
  jest.clearAllMocks();
  mockSystemScheme = 'light';
  current = undefined;
  readAppearance.mockResolvedValue(null);
  writeAppearance.mockResolvedValue();
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
});

test('sem preferência usa escuro e oferece apenas um toggle', async () => {
  await mount();
  expect(current.preference).toBe('dark');
  expect(current.scheme).toBe('dark');
  expect(renderer.root.findAllByType(Switch)).toHaveLength(1);
  expect(toggle().props.value).toBe(true);
  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Sistema'),
  ).toBe(false);
  mockSystemScheme = 'dark';
  await act(async () => renderer.update(tree()));
  expect(current.scheme).toBe('dark');
});

test.each(['light', 'dark'])(
  'restaura %s independentemente do sistema',
  async saved => {
    readAppearance.mockResolvedValue(saved);
    await mount();
    mockSystemScheme = saved === 'dark' ? 'light' : 'dark';
    await act(async () => renderer.update(tree()));
    expect(current.scheme).toBe(saved);
    expect(current.colors).toBe(silverThemes[saved].colors);
    expect(current.effects).toBe(silverThemes[saved].effects);
  },
);

test('toggle persiste e atualiza o tema sem perder o formulário montado', async () => {
  await mount();
  await act(async () =>
    renderer.root.findByType(TextInput).props.onChangeText('Nome em edição'),
  );
  await act(async () => toggle().props.onValueChange(false));
  expect(writeAppearance).toHaveBeenCalledWith('light');
  expect(current.colors).toBe(silverThemes.light.colors);
  expect(
    StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'theme-text' }).props.style,
    ).color,
  ).toBe(silverThemes.light.colors.text);
  expect(renderer.root.findByType(TextInput).props.value).toBe(
    'Nome em edição',
  );
  expect(renderer.root.findByType(TextInput).props.keyboardAppearance).toBe(
    'light',
  );
  expect(renderer.root.findByType(TextInput).props.selectionColor).toBe(
    silverThemes.light.colors.primary,
  );
  expect(toggle().props.value).toBe(false);
  await act(async () => toggle().props.onValueChange(true));
  expect(current.scheme).toBe('dark');
  expect(writeAppearance).toHaveBeenLastCalledWith('dark');
});

test('não mostra conteúdo com tema incorreto antes de restaurar a escolha salva', async () => {
  let finish;
  readAppearance.mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await mount();
  expect(renderer.root.findAllByType(Probe)).toHaveLength(0);
  await act(async () => finish('dark'));
  expect(current.scheme).toBe('dark');
});

test('falha ao salvar conserva tema e campo, informa erro e permite repetir', async () => {
  await mount();
  writeAppearance.mockRejectedValueOnce(new Error('storage'));
  await act(async () => toggle().props.onValueChange(false));
  expect(current.scheme).toBe('dark');
  expect(
    renderer.root
      .findAllByType(Text)
      .some(
        node =>
          node.props.children ===
          'Não foi possível salvar a aparência. Tente novamente.',
      ),
  ).toBe(true);
  await act(async () => toggle().props.onValueChange(false));
  expect(current.scheme).toBe('light');
});

test('serializa cliques e só muda após persistir, evitando escolha não salva', async () => {
  let finish;
  writeAppearance.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await mount();
  let pending;
  await act(async () => {
    pending = current.setPreference('light');
  });
  expect(current.scheme).toBe('dark');
  await act(async () => current.setPreference('dark'));
  expect(writeAppearance).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish();
    await pending;
  });
  expect(current.scheme).toBe('light');
});

test.each(['system', 'cor-inválida', null])(
  'preferência inválida %s usa escuro e falha de leitura não bloqueia',
  async saved => {
    mockSystemScheme = 'dark';
    readAppearance.mockResolvedValueOnce(saved);
    await mount();
    expect(current.scheme).toBe('dark');
    await act(async () => renderer.unmount());
    readAppearance.mockRejectedValueOnce(new Error('indisponível'));
    await mount();
    expect(current.scheme).toBe('dark');
    expect(current.ready).toBe(true);
  },
);

function luminance(hex) {
  const channels = [1, 3, 5]
    .map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
const contrast = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
test.each(['light', 'dark'])(
  'tema %s mantém contraste AA dos textos, botões, alertas e categorias identificáveis',
  scheme => {
    const c = themes[scheme].colors;
    for (const background of [c.background, c.surface, c.surfaceMuted]) {
      for (const foreground of [
        c.text,
        c.secondary,
        c.primary,
        c.positive,
        c.negative,
      ]) {
        expect({
          foreground,
          background,
          readable: contrast(foreground, background) >= 4.5,
        }).toMatchObject({ readable: true });
      }
    }
    for (const [foreground, background] of [
      [c.onPrimary, c.primary],
      [c.onPrimary, c.primaryPressed],
      [c.onDanger, c.dangerButton],
      [c.onDanger, c.dangerPressed],
      [c.onBrand, c.brandPrimary],
      [c.onBrand, c.brandPressed],
      [c.primary, c.primarySoft],
      [c.error, c.errorSoft],
      [c.warning, c.warningSoft],
      [c.positive, c.positiveSoft],
      [c.negative, c.negativeSoft],
      [c.info, c.infoSoft],
      [c.onBalance, c.balanceSurface],
      [c.balanceSecondary, c.balanceSurface],
    ]) {
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(categoryPalettes[scheme].map(item => item.key)).toEqual(
      categoryPalettes.light.map(item => item.key),
    );
    categoryPalettes[scheme].forEach(item => {
      expect(contrast(item.foreground, item.background)).toBeGreaterThanOrEqual(
        3,
      );
      expect(contrast(item.onAccent, item.accent)).toBeGreaterThanOrEqual(3);
      expect(contrast(item.accent, c.surface)).toBeGreaterThanOrEqual(3);
    });
  },
);

// Contraste sobre a superfície translúcida já composta contra o fundo do tema.
function composite(color, background) {
  if (color.startsWith('#')) return color;
  const [r, g, b, alpha] = color.match(/[\d.]+/g).map(Number);
  const backdrop = [1, 3, 5].map(offset =>
    parseInt(background.slice(offset, offset + 2), 16),
  );
  return (
    '#' +
    [r, g, b]
      .map((value, index) =>
        Math.round(value * alpha + backdrop[index] * (1 - alpha))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
test.each(['light', 'dark'])(
  'identidade prateada %s mantém contraste de texto, vidro, navegação e voz',
  scheme => {
    const { colors: c, effects: e } = silverThemes[scheme];
    for (const background of [
      c.background,
      composite(c.surface, c.background),
      c.surfaceMuted,
      c.dialogSurface,
    ]) {
      for (const foreground of [
        c.text,
        c.secondary,
        c.placeholder,
        c.positive,
        c.negative,
      ]) {
        expect({
          foreground,
          background,
          readable: contrast(foreground, background) >= 4.5,
        }).toMatchObject({ readable: true });
      }
    }
    for (const [foreground, background] of [
      [c.onPrimary, c.primary],
      [c.onPrimary, c.primaryPressed],
      [c.onBrand, c.brandPrimary],
      [c.onBrand, c.brandPressed],
      [e.dock.text, e.dock.solidFill],
      [e.dock.activeText, e.dock.solidLens],
      [e.dock.microphoneText, e.dock.solidStrong],
      [e.voiceOrb.control.icon, e.voiceOrb.control.fillTop],
      [e.voiceOrb.control.icon, e.voiceOrb.control.fillBottom],
      [e.toast.text, e.toast.fill],
      [e.toast.secondary, e.toast.fill],
    ])
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    expect(e.ambientLight.intensity).toBeGreaterThan(0.22);
    if (scheme === 'light') expect(e.ambientLight.colors[0]).toBe('#000000');
  },
);
