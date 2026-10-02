import { imageSource } from '../src/utils/imageSource';

test('URL importada pelo Vite vira uma source com uri string', () => {
  expect(imageSource('/assets/santander.webp')).toEqual({ uri: '/assets/santander.webp' });
});

test('objeto importado pelo Expo web nao recebe outro nivel de uri', () => {
  const asset = { uri: '/assets/santander.webp', width: 96, height: 96 };
  expect(imageSource(asset)).toBe(asset);
  expect(typeof imageSource(asset).uri).toBe('string');
});

test('ID de asset nativo permanece valido', () => {
  expect(imageSource(17)).toBe(17);
});
