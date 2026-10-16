// Reserva área própria para a transcrição, sem recortar a ilustração nem o rodapé.
export function voiceSceneLayout(width, height, compact, textEntry = false, keyboardDocked = false) {
  // No modo de texto, a cena encurtada pelo teclado pertence ao orbe.
  // Reservar aqui uma transcrição invisível reduzia o orbe a poucos pixels.
  if (textEntry && (keyboardDocked || height < 340)) {
    const available = Math.max(0, height);
    const showStatus = available >= 100;
    const showWave = !keyboardDocked && available >= 240;
    const status = showStatus ? 58 : 0;
    const wave = showWave ? (compact ? 48 : 64) + 8 : 0;
    const orbSize = Math.max(1, Math.min(280, width - 48, available - status - wave - 8));
    return {
      orbSize,
      distance: 0,
      visualOffset: keyboardDocked ? Math.max(0, (available - orbSize - status - wave) / 2 - 8) : 0,
      visualHeight: orbSize + status + wave,
      transcriptHeight: 0,
      showWave,
      showStatus,
    };
  }
  const sceneHeight = Math.max(160, height);
  const transcriptHeight = Math.min(150, Math.max(compact ? 108 : 126, sceneHeight * 0.3));
  const visualHeight = sceneHeight - transcriptHeight;
  const waveHeight = compact ? 48 : 64;
  const statusHeight = 58;
  const gaps = 16;
  const orbSize = Math.max(24, Math.min(280, width - 48, visualHeight - waveHeight - statusHeight - gaps));
  return {
    orbSize,
    distance: (sceneHeight - transcriptHeight) / 2,
    visualOffset: -transcriptHeight / 2,
    visualHeight: orbSize + waveHeight + statusHeight + gaps,
    transcriptHeight,
    showWave: true,
    showStatus: true,
  };
}
