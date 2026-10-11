import { categoryColors } from '../data/categories';
import { darkColors, lightColors } from './index';

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

// As chaves continuam iguais às salvas na API. Cada cor tem uma versão própria
// para o tema escuro, sem esbranquiçar todas as categorias.
const accents = {
  sage: ['#18845B', '#55DCA1'],
  terracotta: ['#C45C32', '#FF976E'],
  ochre: ['#AC7A08', '#F6C348'],
  blue: ['#326AD7', '#649CFF'],
  lavender: ['#9060C4', '#BB91F5'],
  gray: ['#667587', '#A9BACD'],
  mint: ['#0A8264', '#50DDB3'],
  emerald: ['#087451', '#31D69B'],
  olive: ['#70832B', '#BCCF62'],
  lime: ['#778611', '#C0D94B'],
  peach: ['#B96525', '#FFB279'],
  orange: ['#C36511', '#FFAA52'],
  coral: ['#C54B49', '#FF8584'],
  rose: ['#B8467B', '#F98FC0'],
  red: ['#BF3D54', '#FF7995'],
  purple: ['#7D4ECB', '#B28AFF'],
  cyan: ['#137F9A', '#43CCE8'],
  sand: ['#947041', '#DDB583'],
  navy: ['#395F96', '#8CB3F1'],
  royal: ['#4159CB', '#899BFF'],
  sky: ['#217BB3', '#69BFFF'],
  teal: ['#0D747E', '#4BC4CB'],
  turquoise: ['#08867F', '#44D9CC'],
  forest: ['#32774B', '#7BD59A'],
  mustard: ['#98710B', '#E9BC46'],
  burgundy: ['#9F3C63', '#EE86B0'],
  fuchsia: ['#AF3D9C', '#EF81DD'],
  plum: ['#844A9F', '#C78DE6'],
  brown: ['#93633A', '#D7A57B'],
  slate: ['#536F88', '#8FB4CF'],
};

function tint(surface, accent, strength) {
  return `#${[1, 3, 5]
    .map(offset => {
      const base = parseInt(surface.slice(offset, offset + 2), 16);
      const color = parseInt(accent.slice(offset, offset + 2), 16);
      return Math.round(base * (1 - strength) + color * strength)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
}

function luminance(hex) {
  const channels = [1, 3, 5]
    .map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function palette(scheme) {
  const surface = scheme === 'dark' ? darkColors.surface : lightColors.surface;
  return categoryColors.map(color => {
    const accent = accents[color.key][scheme === 'dark' ? 1 : 0];
    const lightContrast = 1.05 / (luminance(accent) + 0.05);
    const darkContrast =
      (luminance(accent) + 0.05) / (luminance('#101727') + 0.05);
    return {
      ...color,
      accent,
      foreground: accent,
      background: tint(surface, accent, scheme === 'dark' ? 0.18 : 0.12),
      onAccent: lightContrast >= darkContrast ? '#FFFFFF' : '#101727',
    };
  });
}
export const categoryPalettes = {
  light: palette('light'),
  dark: palette('dark'),
};
