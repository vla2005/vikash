/* eslint-env node */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { ambientLight, header, dock } from '../src/theme/silver';

// Verifica os PNGs reais entregues ao app, inclusive drift entre tokens e assets.
function texture(name) {
  const file = fs.readFileSync(path.join(__dirname, '../assets/effects', name + '.png'));
  const width = file.readUInt32BE(16);
  const height = file.readUInt32BE(20);
  const compressed = [];
  for (let offset = 8; offset < file.length;) {
    const length = file.readUInt32BE(offset);
    if (file.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
      compressed.push(file.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }
  const raw = zlib.inflateSync(Buffer.concat(compressed));
  const alpha = Array.from({ length: Math.max(width, height) }, (_, index) => {
    const offset = width === 1 ? index * 5 + 4 : 1 + index * 4 + 3;
    return raw[offset];
  });
  return { width, height, alpha, bytes: file.length };
}
const { horizontal, top, bottomStart } = ambientLight.edgeFade;
const gradients = [
  ['ambient-fade-horizontal', [[0, 1], [horizontal / 2, 0.25], [horizontal, 0], [1 - horizontal, 0], [1 - horizontal / 2, 0.25], [1, 1]]],
  ['ambient-fade-vertical', [[0, 1], [top / 2, 0.25], [top, 0], [bottomStart, 0], [(1 + bottomStart) / 2, 0.25], [1, 1]]],
  ['header-shade', [[0, 1], [0.5, 0.92], [0.78, 0.34], [1, 0]]],
  ['dock-shade', [[0, 0], [0.35, dock.androidShade.middleOpacity], [0.7, dock.androidShade.lowerOpacity], [1, dock.androidShade.opacity]]],
];
test.each(gradients)('%s conserva os stops do SVG, sem recorte ou mudança de contraste', (name, stops) => {
  const image = texture(name);
  expect(image.width * image.height).toBe(2048);
  expect(Math.min(image.width, image.height)).toBe(1);
  expect(image.bytes).toBeLessThan(1536);
  for (let i = 0; i < image.alpha.length; i++) {
    const t = i === 0 ? 0 : i === image.alpha.length - 1 ? 1 : (i + 0.5) / image.alpha.length;
    const index = stops.findIndex(([end], j) => j > 0 && end >= t);
    const [start, a] = stops[index - 1];
    const [end, b] = stops[index];
    const expected = 255 * (a + (b - a) * (t - start) / (end - start));
    expect(Math.abs(image.alpha[i] - expected)).toBeLessThanOrEqual(0.50001);
  }
  expect(image.alpha[0]).toBe(Math.round(stops[0][1] * 255));
  expect(image.alpha.at(-1)).toBe(Math.round(stops.at(-1)[1] * 255));
});

test('header aplica intensidade em runtime e as quatro faixas usam só 32 KiB RGBA', () => {
  expect(header.androidShade.opacity).toBeGreaterThan(0);
  expect(gradients.reduce((sum, [name]) => {
    const image = texture(name);
    return sum + image.width * image.height * 4;
  }, 0)).toBe(32 * 1024);
});
