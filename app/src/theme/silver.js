import { Platform } from 'react-native';
import { renderingEffects } from '../config/renderingEffects';
import { darkColors, lightColors, themes } from './index';

// Acentos compartilhados: Ouro Champagne luminoso no escuro e âmbar profundo no claro.
export const amberAccent = { dark: '#E6A64C', light: '#96601E' };

// A luz de todas as telas fica aqui. Troque as cores sem alterar os layouts.
export const ambientLight = {
  colors: [amberAccent.dark, '#B97432'],
  fields: [
    { x: 0.3, y: 130, radiusX: 240, radiusY: 400 },
    { x: 0.74, y: 220, radiusX: 190, radiusY: 360 },
  ],
  intensity: 0.4,
  height: 660,
  fadeStart: 0.32,
  duration: 16000,
  driftX: 32,
  driftY: 30,
  scale: 1.09,
  overscan: { horizontal: 0.15, vertical: 64 },
  edgeFade: { horizontal: 0.16, top: 0.08, bottomStart: 0.72 },
};

const glass = {
  fill: renderingEffects.cardTransparency
    ? 'rgba(20, 22, 30, 0.72)'
    : '#14161F',
  rim: 'rgba(255, 255, 255, 0.12)',
  highlight: 'rgba(255, 255, 255, 0.12)',
  radius: 24,
  shadow: '0 6px 18px rgba(0,0,0,0.16)',
};

export const header = {
  height: 84,
  paddingTop: 20,
  paddingHorizontal: 20,
  fadeStart: 60,
  blurIntensity: 40,
  webBlurRadius: 18,
  fill: 'rgba(5, 6, 10, 0.24)',
  androidShade: { color: '#05060A', opacity: 1, overhang: 52 },
};

export const toast = {
  fill: '#181A22',
  text: '#F8FAFC',
  secondary: '#C7CCD6',
  success: '#4ADE80',
  error: '#F87171',
  warning: '#FACC15',
  info: '#60A5FA',
};

// Cor, brilho, tamanho e movimento da malha do microfone em um só lugar.
export const voiceOrb = {
  size: 200,
  radius: 65,
  deformation: 0.23,
  duration: 12000,
  wire: '#B8BDC5',
  highlight: '#F1F3F6',
  shadow: '#777E89',
  glow: '#CDD2DA',
  frontOpacity: 0.72,
  backOpacity: 0.16,
  haloOpacity: 0.16,
  transition: { duration: 280 },
  composer: {
    duration: 480,
    expandedHeight: 64,
    maxHeight: 128,
    lift: 56,
    stageHeight: 164,
  },
  wave: {
    height: 64,
    compactHeight: 48,
    duration: 6000,
    color: '#B8C0CB',
  },
  control: {
    size: 72,
    duration: 1800,
    iconDuration: 180,
    fillTop: '#F0F2F5',
    fillBottom: '#AAB1BC',
    rim: '#E2E6EC',
    icon: '#17191D',
    glow: amberAccent.dark,
  },
};

export const dock = {
  height: 64,
  collapsedHeight: 54,
  voiceHeight: 44,
  gap: 10,
  margin: 16,
  fill: 'rgba(30, 32, 42, 0.94)',
  controlFill: 'rgba(20, 22, 30, 0.86)',
  lens: 'rgba(222, 224, 230, 0.22)',
  nativeTint: 'rgba(16, 17, 24, 0.38)',
  nativeNavigationTint: 'rgba(30, 32, 42, 0.48)',
  nativeLensTint: 'rgba(212, 214, 220, 0.18)',
  rim: 'rgba(255, 255, 255, 0.28)',
  controlRim: 'rgba(255, 255, 255, 0.18)',
  solidFill: '#20222C',
  solidLens: '#4B4E5C',
  solidControl: '#1A1C24',
  strongFill: 'rgba(30, 32, 42, 0.94)',
  solidStrong: '#20222C',
  nativeStrongTint: 'rgba(30, 32, 42, 0.48)',
  microphoneText: '#FFFFFF',
  controlSheen: 'rgba(255, 255, 255, 0.23)',
  sheen: 'rgba(255, 255, 255, 0.28)',
  text: '#E6E8EE',
  activeText: '#FFFFFF',
  activeIcon: amberAccent.dark,
  assistantIcon: amberAccent.dark,
  voiceText: '#F1F2F4',
  shadow: '0 6px 18px rgba(0,0,0,0.24)',
  androidShadow: '0 4px 12px rgba(0,0,0,0.40)',
  androidShade: {
    overhang: 104,
    opacity: 0.98,
    color: '#05060A',
    middleOpacity: 0.18,
    lowerOpacity: 0.8,
  },
  shade: { overhang: 64, opacity: 0.92, color: '#05060A' },
  blurIntensity: 60,
  scrollThreshold: 24,
  scrollStart: 90,
};

// Cores calibradas para contraste WCAG AA >= 4.5 em todas as superfícies (background, surface, surfaceMuted, dialogSurface)
const colors = {
  ...darkColors,
  background: '#05060A',
  backgroundSubtle: '#0C0E16',
  backgroundElevated: '#121520',
  surface: glass.fill,
  surfaceStrong: '#181B26',
  dialogSurface: '#181A22',
  surfaceMuted: '#22242E',
  surfaceElevated: '#1E2230',
  card: glass.fill,
  text: '#F8FAFC',
  textSecondary: '#B8BEC9',
  textMuted: '#A2A8B4',
  secondary: '#B8BEC9',
  placeholder: '#A2A8B4',
  primary: '#E6A64C',
  primaryStrong: '#D97706',
  primaryPressed: '#F0BC70',
  primarySoft: '#26221C',
  brandPrimary: '#E6A64C',
  brandPressed: '#F0BC70',
  onBrand: '#141519',
  onPrimary: '#141519',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.16)',
  insetTop: 'rgba(255,255,255,0.14)',
  balanceSurface: glass.fill,
  avatar: '#262936',
  chartMask: '#161820',
  positive: '#79DDB6',
  positiveSoft: '#16352B',
  negative: '#F79B9F',
  negativeSoft: '#392226',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  info: '#60A5FA',
  infoSoft: 'rgba(96, 165, 250, 0.14)',
  onBalance: '#F8FAFC',
  balanceSecondary: '#B8BEC9',
  handle: '#727682',
  logoSurface: '#22242E',
  toggleTrackOff: '#878A91',
  toggleTrackOn: '#A66A22',
  accent: amberAccent.dark,
  toggleThumb: '#FFFFFF',
};

const lightGlass = {
  ...glass,
  fill: renderingEffects.cardTransparency
    ? 'rgba(255,255,255,0.82)'
    : '#FFFFFF',
  rim: 'rgba(17,18,20,0.10)',
  highlight: 'rgba(255,255,255,0.8)',
  shadow: '0 8px 20px rgba(0,0,0,0.06)',
};
const lightPalette = {
  ...lightColors,
  background: '#FAFAFA',
  surface: lightGlass.fill,
  dialogSurface: '#FFFFFF',
  surfaceMuted: '#ECECEE',
  card: lightGlass.fill,
  text: '#111214',
  textSecondary: '#5D5E64',
  secondary: '#5D5E64',
  placeholder: '#62646B',
  primary: '#242527',
  primaryPressed: '#44464B',
  primarySoft: '#E7E8EB',
  brandPrimary: '#242527',
  brandPressed: '#44464B',
  onBrand: '#FFFFFF',
  onPrimary: '#FFFFFF',
  border: 'rgba(17,18,20,0.12)',
  balanceSurface: lightGlass.fill,
  onBalance: '#111214',
  balanceSecondary: '#5D5E64',
  avatar: '#ECECEE',
  handle: '#AAAAB0',
  shadow: '#000000',
  logoSurface: '#FFFFFF',
  chartMask: '#FFFFFF',
  cardShadow: '0 8px 20px rgba(0,0,0,0.06)',
  backdrop: 'rgba(0,0,0,0.46)',
  dialogBackdrop: 'rgba(0,0,0,0.58)',
  toggleTrackOff: '#878A91',
  toggleTrackOn: amberAccent.light,
  accent: amberAccent.light,
  toggleThumb: '#FFFFFF',
};
const lightEffects = {
  ambientLight: { ...ambientLight, colors: ['#000000', '#202124'] },
  glass: lightGlass,
  header: {
    ...header,
    fill: 'rgba(250,250,250,0.22)',
    androidShade: { ...header.androidShade, color: '#FAFAFA' },
  },
  toast: {
    ...toast,
    fill: '#FFFFFF',
    text: '#111214',
    secondary: '#5D5E64',
    success: '#15803D',
    error: '#DC2626',
    warning: '#9C7A00',
    info: '#2563EB',
  },
  voiceOrb: {
    ...voiceOrb,
    wire: '#25272B',
    highlight: '#111214',
    shadow: '#74777D',
    glow: '#55585E',
    wave: { ...voiceOrb.wave, color: '#303238' },
    control: {
      ...voiceOrb.control,
      fillTop: '#383A3D',
      fillBottom: '#111213',
      rim: '#62656A',
      icon: '#FFFFFF',
      glow: amberAccent.light,
    },
  },
  dock: {
    ...dock,
    fill: 'rgba(255,255,255,0.94)',
    controlFill: 'rgba(255,255,255,0.86)',
    lens: 'rgba(36,37,39,0.96)',
    nativeTint: 'rgba(255,255,255,0.46)',
    nativeNavigationTint: 'rgba(255,255,255,0.66)',
    nativeLensTint: 'rgba(36,37,39,0.92)',
    nativeStrongTint: 'rgba(36,37,39,0.92)',
    rim: 'rgba(17,18,20,0.12)',
    controlRim: 'rgba(17,18,20,0.12)',
    solidFill: '#FFFFFF',
    solidControl: '#FFFFFF',
    solidLens: '#242527',
    strongFill: 'rgba(36,37,39,0.96)',
    solidStrong: '#242527',
    sheen: 'rgba(255,255,255,0.84)',
    controlSheen: 'rgba(255,255,255,0.8)',
    text: '#34363B',
    activeText: '#FFFFFF',
    assistantIcon: amberAccent.light,
    voiceText: '#111214',
    microphoneText: '#FFFFFF',
    shadow: '0 6px 18px rgba(0,0,0,0.12)',
    androidShadow: '0 4px 12px rgba(0,0,0,0.18)',
    androidShade: { ...dock.androidShade, color: '#FAFAFA' },
    shade: { ...dock.shade, color: '#FAFAFA' },
  },
};

const createTheme = (scheme, palette, effects) => ({
  ...themes[scheme],
  variant: 'silver',
  colors: palette,
  effects,
  typography: Object.fromEntries(
    Object.entries(themes[scheme].typography).map(([key, value]) => [
      key,
      { ...value, color: key === 'title' ? palette.text : palette.secondary },
    ]),
  ),
});

export const silverThemes = {
  dark: createTheme('dark', colors, {
    ambientLight,
    glass,
    header,
    toast,
    voiceOrb,
    dock,
  }),
  light: createTheme('light', lightPalette, lightEffects),
};

export const silverColors = colors;

const fontSans = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
});
const fontSansMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
});
const fontMono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: '"JetBrains Mono", monospace',
});

export const silverTheme = {
  colors: silverColors,
  radii: {
    xs: 10,
    sm: 14,
    md: 18,
    lg: 24,
    xl: 28,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 26,
    xxl: 34,
  },
  typography: {
    fontFamily: fontSans,
    fontFamilyMedium: fontSansMedium,
    fontFamilyBold: fontSansMedium,
    fontFamilyMono: fontMono,
  },
};
