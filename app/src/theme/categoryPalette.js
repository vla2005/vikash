import { categoryColors } from '../data/categories';
import { darkColors } from './index';

// Categorias mantêm a identidade de cor; no escuro, os ícones ficam mais claros.
export function readableAccent(hex, scheme) {
  if (scheme !== 'dark' || !/^#[0-9a-f]{6}$/i.test(hex)) {
    return hex;
  }
  const channels = [1, 3, 5].map(offset =>
    parseInt(hex.slice(offset, offset + 2), 16),
  );
  return `#${channels
    .map(channel =>
      Math.round(channel + (255 - channel) * 0.55)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

const darkCategoryColors = categoryColors.map(color => ({
  ...color,
  foreground: readableAccent(color.foreground, 'dark'),
  background: `#${[1, 3, 5]
    .map(offset => {
      const base = parseInt(darkColors.surface.slice(offset, offset + 2), 16);
      const accent = parseInt(color.foreground.slice(offset, offset + 2), 16);
      return Math.round(base * 0.82 + accent * 0.18)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`,
}));
export const categoryPalettes = {
  light: categoryColors,
  dark: darkCategoryColors,
};
