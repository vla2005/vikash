import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated, Platform } from 'react-native';
import BalanceEvolutionChart from '../src/components/BalanceEvolutionChart';
import useReducedMotion from '../src/hooks/useReducedMotion';

jest.mock('../src/hooks/useReducedMotion', () => ({ __esModule: true, default: jest.fn(() => true) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  const shape = name => ReactModule.forwardRef((props, ref) => ReactModule.createElement(name, { ...props, ref }));
  return { __esModule: true, default: shape('Svg'), Circle: shape('Circle'), Defs: shape('Defs'), G: shape('G'),
    LinearGradient: shape('LinearGradient'), Line: shape('Line'), Path: shape('Path'), Polygon: shape('Polygon'),
    Rect: shape('Rect'), Stop: shape('Stop'), Text: shape('SvgText') };
});

let renderer;
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  useReducedMotion.mockReturnValue(true);
  jest.restoreAllMocks();
});

test.each(['android', 'ios'])('%s desenha linha completa sem recorte e mantém tooltip', async platform => {
  jest.replaceProperty(Platform, 'OS', platform);
  const points = Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-0${index + 1}`, balance: (index - 3) * 100 }));
  await act(async () => { renderer = TestRenderer.create(<BalanceEvolutionChart points={points} />); });
  const line = renderer.root.findAllByType('Path').find(node => node.props.stroke);
  expect(line.props.d.match(/L /g)).toHaveLength(6);
  expect(line.props.d).not.toMatch(/NaN|Infinity/);
  expect(line.props.strokeDashoffset).toBe(0);
  expect(renderer.root.findAll(node => node.props.clipPath)).toHaveLength(0);
  expect(renderer.root.findAllByType('SvgText').some(node => /^R\$\s300,00$/.test(node.props.children))).toBe(true);
});

test('um único dia não gera coordenadas inválidas nem tenta desenhar dias ausentes', async () => {
  await act(async () => { renderer = TestRenderer.create(<BalanceEvolutionChart points={[{ date: '2026-10-10', balance: 50 }]} />); });
  expect(renderer.root.findAllByType('Path').every(node => !/NaN|Infinity/.test(node.props.d))).toBe(true);
  expect(renderer.root.findAllByType('Circle')).toHaveLength(1);
  expect(renderer.root.findAllByType('SvgText').some(node => node.props.children === '10 out')).toBe(true);
});

test('Android mantém animação de desenho e libera animação ao ocultar valores', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  useReducedMotion.mockReturnValue(false);
  const stop = jest.fn();
  const timing = jest.spyOn(Animated, 'timing').mockReturnValue({ start: jest.fn(), stop });
  const points = [{ date: '2026-10-09', balance: 10 }, { date: '2026-10-10', balance: 20 }];
  await act(async () => { renderer = TestRenderer.create(<BalanceEvolutionChart points={points} />); });
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 900, useNativeDriver: false }));
  await act(async () => renderer.update(<BalanceEvolutionChart points={points} hidden />));
  expect(stop).toHaveBeenCalled();
  expect(renderer.root.findAllByType('Svg')).toHaveLength(0);
});
