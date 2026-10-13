import fs from 'fs';
import CanvasKitInit from 'canvaskit-wasm';
import { createWavePaths, WAVE_STEPS } from '../src/utils/nativeWavePaths';
import { projectListeningWave } from '../src/utils/listeningWave';

let skia;
let poses;
beforeAll(async () => {
  skia = await CanvasKitInit({
    wasmBinary: fs.readFileSync(
      require.resolve('canvaskit-wasm/bin/canvaskit.wasm'),
    ),
  });
  poses = createWavePaths(() => {
    const builder = new skia.PathBuilder();
    return {
      moveTo: (x, y) => builder.moveTo(x, y),
      lineTo: (x, y) => builder.lineTo(x, y),
      build: () => builder.detachAndDelete(),
    };
  });
}, 15000);
afterAll(() => {
  for (const path of new Set([...poses.strands, ...poses.ribs])) {
    path.delete();
  }
});

test('paths nativos interpolam sem cortes e preservam a curva SVG com erro menor que meio pixel', () => {
  let maxError = 0;
  for (let frame = 0; frame <= 128; frame++) {
    const phase = (frame * Math.PI * 2) / 128;
    const position = (phase / (Math.PI * 2)) * WAVE_STEPS;
    const index = Math.min(WAVE_STEPS - 1, Math.floor(position));
    const weight = position - index;
    const original = projectListeningWave(phase, 24, 5);
    for (const kind of ['strands', 'ribs']) {
      const current = poses[kind][index];
      const next = poses[kind][index + 1];
      expect(skia.Path.CanInterpolate(current, next)).toBe(true);
      const actual = skia.Path.MakeFromPathInterpolation(next, current, weight);
      const expected = skia.Path.MakeFromSVGString(original[kind]);
      const a = actual.toCmds();
      const b = expected.toCmds();
      expect(a.length).toBe(b.length);
      for (let i = 0; i < a.length; i++) {
        maxError = Math.max(maxError, Math.abs(a[i] - b[i]));
      }
      const bounds = actual.getBounds();
      expect(bounds[0]).toBe(0);
      expect(bounds[2]).toBe(300);
      expect(bounds[1]).toBeGreaterThanOrEqual(0);
      expect(bounds[3]).toBeLessThanOrEqual(76);
      actual.delete();
      expected.delete();
    }
  }
  expect(maxError).toBeLessThan(0.5);
  expect(poses.strands.at(-1)).toBe(poses.strands[0]);
  expect(poses.ribs.at(-1)).toBe(poses.ribs[0]);
});
