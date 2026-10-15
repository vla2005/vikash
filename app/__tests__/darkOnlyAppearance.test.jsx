import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Switch, TextInput } from 'react-native';
import { ThemeProvider, ThemeVariant, useTheme } from '../src/contexts/ThemeContext';
import AppearanceSettings from '../src/components/AppearanceSettings';
import FormField from '../src/components/FormField';
import { readAppearance, writeAppearance } from '../src/services/appearanceStorage';
import { silverThemes } from '../src/theme/silver';

jest.mock('../src/services/appearanceStorage', () => ({
  readAppearance: jest.fn(() => Promise.resolve('light')),
  writeAppearance: jest.fn(),
}));
jest.mock('../src/components/Icon', () => 'Icon');

let theme;
function Probe() {
  theme = useTheme();
  return <><AppearanceSettings /><FormField label="Nome" /></>;
}

test('modo escuro exclusivo ignora claro salvo, oculta toggle e bloqueia troca', async () => {
  let renderer;
  try {
    await act(async () => {
      renderer = TestRenderer.create(<ThemeProvider><ThemeVariant><Probe /></ThemeVariant></ThemeProvider>);
    });
    expect(theme.ready).toBe(true);
    expect(theme.scheme).toBe('dark');
    expect(theme.preference).toBe('dark');
    expect(theme.colors).toBe(silverThemes.dark.colors);
    expect(theme.effects).toBe(silverThemes.dark.effects);
    expect(renderer.root.findAllByType(Switch)).toHaveLength(0);
    expect(renderer.root.findByType(TextInput).props.keyboardAppearance).toBe('dark');
    await act(async () => theme.setPreference('light'));
    expect(theme.scheme).toBe('dark');
    expect(readAppearance).not.toHaveBeenCalled();
    expect(writeAppearance).not.toHaveBeenCalled();
  } finally {
    await act(async () => renderer?.unmount());
  }
});