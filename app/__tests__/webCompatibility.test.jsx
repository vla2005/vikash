import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TestRenderer, { act } from 'react-test-renderer';
import { Image, Platform, StyleSheet } from 'react-native';
import Icon from '../src/components/Icon';
import CategoryIcon from '../src/components/CategoryIcon';
import BrandLogo from '../src/components/BrandLogo';
import { silverThemes } from '../src/theme/silver';

// Like the Expo web SVG renderer, these DOM shapes forward accessibility props.
jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  const shape = tag => props => ReactModule.createElement(tag, props);
  return {
    __esModule: true,
    default: shape('svg'),
    Path: shape('path'),
    Circle: shape('circle'),
    Rect: shape('rect'),
    Line: shape('line'),
    Polyline: shape('polyline'),
    Ellipse: shape('ellipse'),
    Polygon: shape('polygon'),
  };
});

let renderer;
afterEach(async () => {
  if (renderer) {
    await act(async () => renderer.unmount());
    renderer = null;
  }
  jest.restoreAllMocks();
});

test('ícones decorativos no Expo web ficam ocultos da acessibilidade sem atributo HTML inválido', () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  const html = renderToStaticMarkup(
    <>
      <Icon name="eye" />
      <CategoryIcon name="wallet" />
    </>,
  );
  expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
  expect(html).not.toMatch(/\saccessible=/);
  expect(error).not.toHaveBeenCalled();
});

test.each(['android', 'ios'])('ícones mantêm a propriedade de acessibilidade nativa no %s', async platform => {
  jest.replaceProperty(Platform, 'OS', platform);
  await act(async () => {
    renderer = TestRenderer.create(<><Icon name="eye" /><CategoryIcon name="wallet" /></>);
  });
  const icons = renderer.root.findAllByType('svg');
  expect(icons).toHaveLength(2);
  icons.forEach(icon => {
    expect(icon.props.accessible).toBe(false);
    expect(icon.props['aria-hidden']).toBeUndefined();
  });
});

test('logo aplica a cor pela API da imagem e não pelo estilo deprecated', async () => {
  await act(async () => { renderer = TestRenderer.create(<BrandLogo />); });
  const image = renderer.root.findByType(Image);
  expect(image.props.tintColor).toBe(silverThemes.dark.colors.text);
  expect(StyleSheet.flatten(image.props.style).tintColor).toBeUndefined();
});
