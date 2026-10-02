// Vite importa uma URL; Metro pode importar um objeto de imagem ou um ID de asset.
export const imageSource = asset => typeof asset === 'string' ? { uri: asset } : asset;
