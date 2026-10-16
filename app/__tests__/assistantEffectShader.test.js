import fs from 'fs';
import CanvasKitInit from 'canvaskit-wasm';
import { SHADER_SKSL } from '../src/shared/components/reacticx/organisms/apple-intelligence/conf';
let skia, effect;
beforeAll(async () => {
  skia = await CanvasKitInit({ wasmBinary:fs.readFileSync(require.resolve('canvaskit-wasm/bin/canvaskit.wasm')) });
  const errors = [];
  effect = skia.RuntimeEffect.Make(SHADER_SKSL, error => errors.push(error));
  expect(errors).toEqual([]);
  expect(effect).not.toBeNull();
}, 15000);
afterAll(() => effect?.delete());
function render(phase) {
  const width = 160, height = 320;
  const values = { iTime:phase, intensity:1, iResolution:[width, height],
    uMargin:1, uExcess:8, uRadius:22, uWaveSpeed:10, uWaveStrength:0.65, uWaveOrigin:[0.5,1],
    uNoiseScale:2, uNoiseSpeed:4, uNoiseStrength:0.6, uGlowSpeed:0.16, uGlowSaturation:0.85, uGlowLightness:0.6,
    uShimmerAmount:0.3, uShimmerSpeed:2, uColorCount:5,
    uColor0:[0.90,0.65,0.30], uColor1:[1,0.42,0.62], uColor2:[0.69,0.42,1],
    uColor3:[0.35,0.79,0.96], uColor4:[0.90,0.65,0.30], uColor5:[0,0,0], uColor6:[0,0,0], uColor7:[0,0,0] };
  const uniforms = new Float32Array(effect.getUniformFloatCount());
  const integers = new Int32Array(uniforms.buffer);
  for (let i = 0; i < effect.getUniformCount(); i++) {
    const { slot, isInteger } = effect.getUniform(i);
    const value = values[effect.getUniformName(i)];
    if (isInteger) integers[slot] = value;
    else uniforms.set(Array.isArray(value) ? value : [value], slot);
  }
  const child = skia.Shader.MakeColor(skia.TRANSPARENT, skia.ColorSpace.SRGB);
  const shader = effect.makeShaderWithChildren(uniforms, [child]);
  const paint = new skia.Paint(); paint.setShader(shader);
  const surface = skia.MakeSurface(width, height);
  surface.getCanvas().clear(skia.TRANSPARENT);
  surface.getCanvas().drawPaint(paint); surface.flush();
  const pixels = surface.getCanvas().readPixels(0,0,{ width,height,colorType:skia.ColorType.RGBA_8888,
    alphaType:skia.AlphaType.Unpremul,colorSpace:skia.ColorSpace.SRGB }).slice();
  paint.delete(); shader.delete(); child.delete(); surface.delete();
  return pixels;
}
test('real Skia keeps animated colored edges visible without a captured image and leaves the center transparent', () => {
  const first = render(0), later = render(1.3);
  let visible = 0, changing = 0, colorful = 0;
  for (let i=0;i<first.length;i+=4) {
    if (first[i+3] > 20) {
      visible++;
      if (Math.max(first[i],first[i+1],first[i+2]) - Math.min(first[i],first[i+1],first[i+2]) > 20) colorful++;
    }
    changing += Math.abs(first[i] - later[i]) + Math.abs(first[i+1] - later[i+1]);
  }
  expect(visible).toBeGreaterThan(500);
  expect(colorful).toBeGreaterThan(500);
  expect(changing).toBeGreaterThan(10000);
  expect(first[(160*160+80)*4+3]).toBe(0);
});
