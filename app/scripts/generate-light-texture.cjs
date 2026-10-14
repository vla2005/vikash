/* eslint-env node */
/* eslint-disable no-bitwise -- CRC-32 dos chunks PNG usa operações bit a bit. */
// Texturas neutras procedurais: regenerar após alterar fadeStart/edgeFade em silver.js.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const text = fs.readFileSync(path.join(root, 'src/theme/silver.js'), 'utf8');
const config = text.match(/export const ambientLight = (\{[\s\S]*?\n\});/);
if (!config) {
  throw new Error('ambientLight não encontrado');
}
const { fadeStart, edgeFade } = vm.runInNewContext('(' + config[1] + ')');
function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  payload.copy(result, 4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, data.length + 8);
  return result;
}
function writeTexture(name, width, height, alphaAt) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * (width * 4 + 1) + 1 + x * 4;
      raw[i] = raw[i + 1] = raw[i + 2] = 255;
      raw[i + 3] = Math.round(Math.max(0, Math.min(1, alphaAt(x, y))) * 255);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  const output = path.join(root, 'assets/effects', name + '.png');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, png);
  console.log(`${name}: ${png.length} bytes PNG; ${width * height * 4} bytes RGBA.`);
}
function ramp(t, stops) {
  for (let i = 1; i < stops.length; i++) {
    const [end, opacity] = stops[i];
    const [start, previous] = stops[i - 1];
    if (t <= end) { return previous + (opacity - previous) * (t - start) / (end - start); }
  }
  return stops.at(-1)[1];
}
const size = 128;
writeTexture('ambient-light', size, size, (x, y) => {
  const r = Math.hypot(((x + 0.5) * 2) / size - 1, ((y + 0.5) * 2) / size - 1);
  return r <= fadeStart ? 1 - (0.65 * r) / fadeStart : Math.max(0, (0.35 * (1 - r)) / (1 - fadeStart));
});
// Equivalentes aos dois gradientes SVG da máscara fixa, com extremos opacos.
// Faixas de 1 pixel evitam bitmaps do tamanho da tela e preservam a interpolação.
const { horizontal, top, bottomStart } = edgeFade;
const stripSize = 2048;
const position = index => index === 0 ? 0 : index === stripSize - 1 ? 1 : (index + 0.5) / stripSize;
writeTexture('ambient-fade-horizontal', stripSize, 1, x => ramp(position(x), [
  [0, 1], [horizontal / 2, 0.25], [horizontal, 0],
  [1 - horizontal, 0], [1 - horizontal / 2, 0.25], [1, 1],
]));
writeTexture('ambient-fade-vertical', 1, stripSize, (_, y) => ramp(position(y), [
  [0, 1], [top / 2, 0.25], [top, 0],
  [bottomStart, 0], [(1 + bottomStart) / 2, 0.25], [1, 1],
]));
// Sombreados fixos do header e dock Android; cores continuam em tintColor.
const readConfig = name => {
  const match = text.match(new RegExp('export const ' + name + ' = (\\{[\\s\\S]*?\\n\\});'));
  if (!match) { throw new Error(name + ' não encontrado'); }
  return vm.runInNewContext('(' + match[1] + ')');
};
const dockShade = readConfig('dock').androidShade;
writeTexture('header-shade', 1, stripSize, (_, y) => ramp(position(y), [
  [0, 1], [0.5, 0.92], [0.78, 0.34], [1, 0],
]));
writeTexture('dock-shade', 1, stripSize, (_, y) => ramp(position(y), [
  [0, 0], [0.35, dockShade.middleOpacity], [0.7, dockShade.lowerOpacity], [1, dockShade.opacity],
]));
