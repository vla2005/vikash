// 32 poses por ciclo: o frame apenas interpola dois paths nativos.
// A API do builder é injetada para verificar a geometria com Skia real nos testes.
export const WAVE_STEPS = 32;
export const WAVE_COLUMNS = 24;
export const WAVE_ROWS = 5;

export function waveHeight(t, phase) {
  const envelope = Math.pow(Math.sin(Math.PI * t), 1.4);
  const carrier =
    0.55 +
    0.25 * Math.sin(t * Math.PI * 5 - phase) +
    0.2 * Math.cos(t * Math.PI * 9 + phase * 2);
  return 3 + envelope * (10 + carrier * 39);
}

export function createWavePaths(makeBuilder) {
  const phases = [];
  const strands = [];
  const ribs = [];
  for (let frame = 0; frame < WAVE_STEPS; frame++) {
    const phase = (frame * Math.PI * 2) / WAVE_STEPS;
    const heights = Array.from({ length: WAVE_COLUMNS + 1 }, (_, column) =>
      waveHeight(column / WAVE_COLUMNS, phase),
    );
    const strand = makeBuilder();
    const rib = makeBuilder();
    for (let column = 0; column <= WAVE_COLUMNS; column++) {
      const x = (column * 300) / WAVE_COLUMNS;
      rib.moveTo(x, 66);
      rib.lineTo(x, 66 - heights[column]);
    }
    for (let row = 1; row <= WAVE_ROWS; row++) {
      for (let column = 0; column <= WAVE_COLUMNS; column++) {
        const x = (column * 300) / WAVE_COLUMNS;
        const y = 66 - (heights[column] * row) / WAVE_ROWS;
        if (column === 0) {
          strand.moveTo(x, y);
        } else {
          strand.lineTo(x, y);
        }
      }
    }
    phases.push(phase);
    strands.push(strand.build());
    ribs.push(rib.build());
  }
  phases.push(Math.PI * 2);
  strands.push(strands[0]);
  ribs.push(ribs[0]);
  return { phases, strands, ribs };
}
