// PNG procedural neutro: regenerar após alterar ambientLight.fadeStart.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const text = fs.readFileSync(path.join(root, 'src/theme/silver.js'), 'utf8');
const config = text.match(/export const ambientLight = (\{[\s\S]*?\n\});/);
if (!config) {
  throw new Error('ambientLight não encontrado');
}
const { fadeStart } = new Function('return (' + config[1] + ')')();
const size = 128;
const raw = Buffer.alloc((size * 4 + 1) * size);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const r = Math.hypot(
      ((x + 0.5) * 2) / size - 1,
      ((y + 0.5) * 2) / size - 1,
    );
    const alpha =
      r <= fadeStart
        ? 1 - (0.65 * r) / fadeStart
        : Math.max(0, (0.35 * (1 - r)) / (1 - fadeStart));
    const i = y * (size * 4 + 1) + 1 + x * 4;
    raw[i] = raw[i + 1] = raw[i + 2] = 255;
    raw[i + 3] = Math.round(alpha * 255);
  }
}
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
const header = Buffer.alloc(13);
header.writeUInt32BE(size);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', header),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const output = path.join(root, 'assets/effects/ambient-light.png');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, png);
console.log(png.length + ' bytes PNG; ' + size * size * 4 + ' bytes RGBA.');
