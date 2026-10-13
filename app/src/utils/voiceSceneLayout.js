// Reserva área própria para a transcrição, sem recortar a ilustração nem o rodapé.
export function voiceSceneLayout(width, height, compact) {
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
  };
}
