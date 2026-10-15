// Cobre também a paleta clara preservada, apesar de desabilitada no app.
jest.mock('../src/config/appearance', () => ({ lightThemeEnabled: true }));
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import VoiceAnalysisFeedback from '../src/components/VoiceAnalysisFeedback';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { readAppearance } from '../src/services/appearanceStorage';
import { silverThemes } from '../src/theme/silver';
jest.mock('../src/services/appearanceStorage', () => ({ readAppearance: jest.fn(), writeAppearance: jest.fn() }));
jest.mock('../src/components/Icon', () => 'Icon');

test.each(['dark', 'light'])('avisos usam cores só no indicador e superfície opaca no tema %s', async scheme => {
  readAppearance.mockResolvedValue(scheme);
  let renderer;
  const edit = jest.fn();
  const render = type => <ThemeProvider><VoiceAnalysisFeedback feedback={{ type, title: 'Confira', message: 'Complete o lançamento.' }} onEdit={edit} /></ThemeProvider>;
  await act(async () => { renderer = TestRenderer.create(render('warn')); });
  const { colors, effects } = silverThemes[scheme];
  const panelStyle = () => StyleSheet.flatten(renderer.root.findByProps({ testID: 'voice-analysis-feedback' }).props.style);
  expect(panelStyle().backgroundColor).toBe(colors.dialogSurface);
  expect(renderer.root.findAllByType('Icon')[0].props.color).toBe(effects.toast.warning);
  const textColors = renderer.root.findAllByType(Text).map(node => StyleSheet.flatten(node.props.style).color);
  expect(textColors.every(color => color === colors.text || color === colors.secondary)).toBe(true);
  await act(async () => renderer.root.findAll(node => node.props.accessibilityLabel === 'Corrigir transcrição' && node.props.onPress)[0].props.onPress());
  expect(edit).toHaveBeenCalledTimes(1);
  await act(async () => renderer.update(render('error')));
  expect(renderer.root.findAllByType('Icon')[0].props.color).toBe(effects.toast.error);
  expect(panelStyle().backgroundColor).toBe(colors.dialogSurface);
  expect(renderer.root.findAllByProps({ accessibilityRole: 'alert' })[0].props.accessibilityLiveRegion).toBe('assertive');
  await act(async () => renderer.unmount());
});
