import { nextDockScroll } from '../src/utils/dockScroll';

test('barra compacta somente depois de rolar uma distância significativa', () => {
  expect(nextDockScroll(50, 0, false, 800).collapsed).toBe(false);
  expect(nextDockScroll(120, 100, false, 800).collapsed).toBe(false);
  expect(nextDockScroll(128, 100, false, 800).collapsed).toBe(true);
});
test('reversão reabre a barra e pequenas correções não causam oscilação', () => {
  const down = nextDockScroll(320, 180, true, 800);
  expect(nextDockScroll(305, down.anchor, true, 800).collapsed).toBe(true);
  expect(nextDockScroll(290, down.anchor, true, 800).collapsed).toBe(false);
});
test('bounce e telas sem conteúdo suficiente mantêm os atalhos abertos', () => {
  expect(nextDockScroll(-20, 120, true, 800).collapsed).toBe(false);
  expect(nextDockScroll(60, 0, false, 70).collapsed).toBe(false);
  expect(nextDockScroll(900, 800, true, 800).anchor).toBe(800);
});
