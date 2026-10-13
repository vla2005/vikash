// Malha pequena: dois paths, sem views ou renders React por ponto.
export function projectListeningWave(phase) {
  'worklet';
  const columns = 40;
  const heights = [];
  let ribs = '';
  let strands = '';
  for (let column = 0; column <= columns; column++) {
    const t = column / columns;
    const envelope = Math.pow(Math.sin(Math.PI * t), 1.4);
    const carrier =
      0.55 +
      0.25 * Math.sin(t * Math.PI * 5 - phase) +
      0.2 * Math.cos(t * Math.PI * 9 + phase * 2);
    const height = 3 + envelope * (10 + carrier * 39);
    heights.push(height);
    const x = (t * 300).toFixed(2);
    ribs += `M${x},66L${x},${(66 - height).toFixed(2)}`;
  }
  for (let row = 1; row <= 7; row++) {
    for (let column = 0; column <= columns; column++) {
      const x = ((column / columns) * 300).toFixed(2);
      const y = (66 - (row / 7) * heights[column]).toFixed(2);
      strands += `${column === 0 ? 'M' : 'L'}${x},${y}`;
    }
  }
  return { strands, ribs };
}
