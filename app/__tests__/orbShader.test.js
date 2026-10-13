import fs from 'fs';
import CanvasKitInit from 'canvaskit-wasm';
import { orbShaderSource, orbUniforms } from '../src/utils/orbShader';
import { silverThemes } from '../src/theme/silver';

let skia;
let effect;
beforeAll(async () => {
  skia = await CanvasKitInit({
    wasmBinary: fs.readFileSync(
      require.resolve('canvaskit-wasm/bin/canvaskit.wasm'),
    ),
  });
  const errors = [];
  effect = skia.RuntimeEffect.Make(orbShaderSource, error =>
    errors.push(error),
  );
  expect(errors).toEqual([]);
  expect(effect).not.toBeNull();
}, 15000);
afterAll(() => effect?.delete());

function render(size, phase, scheme) {
  const uniforms = {
    ...orbUniforms(size, silverThemes[scheme].effects.voiceOrb),
    phase,
  };
  const surface = skia.MakeSurface(size, size);
  const paint = new skia.Paint();
  const shader = effect.makeShader(Object.values(uniforms).flat());
  paint.setShader(shader);
  const canvas = surface.getCanvas();
  canvas.clear(skia.TRANSPARENT);
  canvas.drawPaint(paint);
  surface.flush();
  const pixels = canvas
    .readPixels(0, 0, {
      width: size,
      height: size,
      colorType: skia.ColorType.RGBA_8888,
      alphaType: skia.AlphaType.Unpremul,
      colorSpace: skia.ColorSpace.SRGB,
    })
    .slice();
  shader.delete();
  paint.delete();
  surface.delete();
  return pixels;
}

test.each(['light', 'dark'])(
  'shader real renderiza %s sem cortar as bordas',
  scheme => {
    const size = 120;
    for (let frame = 0; frame < 12; frame++) {
      const pixels = render(size, (frame * Math.PI) / 6, scheme);
      let visible = 0;
      let borderAlpha = 0;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const alpha = pixels[(y * size + x) * 4 + 3];
          if (alpha > 30) {
            visible++;
          }
          if (x < 2 || x >= size - 2 || y < 2 || y >= size - 2) {
            borderAlpha += alpha;
          }
        }
      }
      expect(visible).toBeGreaterThan(500);
      expect(borderAlpha).toBe(0);
    }
  },
);

test('a forma muda, o loop fecha sem salto e a malha troca de cor com o tema', () => {
  const start = render(120, 0, 'dark');
  const middle = render(120, Math.PI / 2, 'dark');
  const end = render(120, Math.PI * 2, 'dark');
  const light = render(120, 0, 'light');
  let motion = 0;
  let seam = 0;
  let darkInk = 0;
  let lightInk = 0;
  for (let i = 0; i < start.length; i += 4) {
    motion += Math.abs(start[i + 3] - middle[i + 3]);
    seam += Math.abs(start[i + 3] - end[i + 3]);
    if (start[i + 3] > 30) {
      darkInk += start[i];
      lightInk += light[i];
    }
  }
  expect(motion).toBeGreaterThan(10000);
  expect(seam / (120 * 120)).toBeLessThan(0.1);
  expect(darkInk).toBeGreaterThan(lightInk * 2);
});
