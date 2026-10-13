import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';
import VoiceScene from '../src/components/VoiceScene';
import VoiceMicGlyph from '../src/components/VoiceMicGlyph';
import { voiceSceneLayout } from '../src/utils/voiceSceneLayout';
jest.mock('../src/components/Icon', () => 'Icon');
let renderer;
afterEach(async () => { await act(async () => renderer?.unmount()); renderer = null; });
test('as camadas de captura e revisão ocupam a mesma área nativa, sem empurrar o texto para fora', async () => {
  await act(async () => { renderer = TestRenderer.create(<VoiceScene review distance={150} visualOffset={-60} visual={<Text>Esfera</Text>}><Text>Gastei cinquenta no Pix do Inter</Text></VoiceScene>); });
  const layers = renderer.root.findAllByType(View).map(node => StyleSheet.flatten(node.props.style)).filter(style => style?.position === 'absolute');
  expect(layers.length).toBeGreaterThanOrEqual(2);
  layers.forEach(style => expect(style).toMatchObject({ top: 0, bottom: 0, left: 0, right: 0 }));
});
test('os dois símbolos do microfone ficam sobrepostos no centro, sem ocupar duas linhas', async () => {
  await act(async () => { renderer = TestRenderer.create(<VoiceMicGlyph review />); });
  const icons = renderer.root.findAllByType(View).map(node => StyleSheet.flatten(node.props.style)).filter(style => style?.position === 'absolute');
  expect(icons.length).toBeGreaterThanOrEqual(2);
  icons.forEach(style => expect(style).toMatchObject({ top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }));
});
test.each([[360,300,true],[390,500,false],[414,600,false],[320,340,true]])('a ilustração cabe na cena %sx%s e preserva área para o texto', (width,height,compact) => {
  const layout = voiceSceneLayout(width,height,compact);
  const top = (height-layout.visualHeight)/2+layout.visualOffset;
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top+layout.visualHeight).toBeLessThanOrEqual(height-layout.transcriptHeight);
  expect(layout.orbSize).toBeLessThanOrEqual(width-48);
  expect(layout.transcriptHeight).toBeGreaterThanOrEqual(compact ? 108 : 126);
});
