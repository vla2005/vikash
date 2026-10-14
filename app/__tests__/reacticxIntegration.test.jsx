import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import * as Motion from 'react-native-reanimated';
import BalanceCard from '../src/components/BalanceCard';
import CategoryDonut from '../src/components/CategoryDonut';
import { FadeComponent } from '../src/shared/components/reacticx/base/fade-component';
import PieChart from '../src/shared/components/reacticx/charts/pie-chart';
import { arcPath, toSlices } from '../src/shared/components/reacticx/charts/pie-chart/helper';
import { formatCurrency } from '../src/utils/money';

let renderer;
afterEach(async () => { await act(async () => renderer?.unmount()); renderer = null; jest.restoreAllMocks(); });
test.each([1234.56, -1234.56, 0, 1.005])('saldo estático %s mantém formatação BRL e oculta imediatamente', async amount => {
  await act(async () => { renderer = TestRenderer.create(<BalanceCard value={formatCurrency(amount)} />); });
  const value = renderer.root.findAllByType(Text).find(node => node.props.children === formatCurrency(amount));
  expect(value.props).toMatchObject({ numberOfLines: 1, adjustsFontSizeToFit: true });
  await act(async () => renderer.update(<BalanceCard value="••••••" />));
  const text = renderer.root.findAllByType(Text).map(node => node.props.children).join(' ');
  expect(text).toContain('••••••');
  expect(text).not.toContain('R$');
});

test('carregamento usa FadeComponent curto e preserva o conteúdo da mesma instância', async () => {
  await act(async () => { renderer = TestRenderer.create(<BalanceCard loading value="—" />); });
  const fade = renderer.root.findByType(FadeComponent);
  expect(fade.props).toMatchObject({ state: 'from', duration: 180 });
  await act(async () => renderer.update(<BalanceCard value={formatCurrency(100)} />));
  expect(renderer.root.findByType(FadeComponent)).toBe(fade);
  expect(fade.props.state).toBe('to');
});
test('PieChart recebe as cores/valores reais, limpa animações e apaga dados ao ocultar', async () => {
  const slices = [{ key: 'a', total: 20, color: '#FFCC00' }, { key: 'b', total: 80, color: '#00CC88' }];
  const timing = jest.spyOn(Motion, 'withTiming');
  const cancel = jest.spyOn(Motion, 'cancelAnimation');
  await act(async () => { renderer = TestRenderer.create(<CategoryDonut slices={slices} periodLabel="Outubro" />); });
  expect(renderer.root.findByType(PieChart.Root.type).props.data).toEqual([{ label: 'a', value: 20, color: '#FFCC00' }, { label: 'b', value: 80, color: '#00CC88' }]);
  await act(async () => renderer.root.findAll(node => typeof node.props.onLayout === 'function')[0].props.onLayout({ nativeEvent: { layout: { width: 200, height: 200 } } }));
  expect(timing).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 900, reduceMotion: 'never' }));
  await act(async () => renderer.update(<CategoryDonut slices={slices} hidden periodLabel="Outubro" />));
  expect(renderer.root.findByType(PieChart.Root.type).props.data).toEqual([]);
  expect(cancel).toHaveBeenCalled();
});
test('geometria mantém rosca para uma categoria única e dados vazios não produzem NaN', () => {
  const path = arcPath(100, 100, 87, 65, 0, Math.PI * 2);
  expect(path.match(/M /g)).toHaveLength(2);
  expect(path).not.toContain('NaN');
  expect(toSlices([])).toEqual([]);
  expect(toSlices([{ label: 'a', value: 0 }])).toEqual([{ value: 0, fraction: 0 }]);
});

test('ocultar no meio da entrada e mostrar de novo reinicia o desenho completo', async () => {
  const timing = jest.spyOn(Motion, 'withTiming').mockImplementation(() => 0.4);
  const slices = [{ key: 'a', total: 100, color: '#FFCC00' }];
  await act(async () => { renderer = TestRenderer.create(<CategoryDonut slices={slices} periodLabel="Outubro" />); });
  await act(async () => renderer.root.findAll(node => typeof node.props.onLayout === 'function')[0].props.onLayout({ nativeEvent: { layout: { width: 200, height: 200 } } }));
  await act(async () => renderer.update(<CategoryDonut slices={slices} hidden periodLabel="Outubro" />));
  timing.mockClear();
  await act(async () => renderer.update(<CategoryDonut slices={slices} periodLabel="Outubro" />));
  expect(timing).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 900 }));
});
