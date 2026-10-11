import { Platform } from 'react-native';

export const lightColors = {
  background: '#F4F7FC',
  surface: '#FFFFFF',
  text: '#15244A',
  secondary: '#626F85',
  primary: '#2348EF',
  primaryPressed: '#1838CB',
  primarySoft: '#E8EDFF',
  surfaceMuted: '#F0F4FC',
  border: '#DFE6F2',
  positive: '#13765A',
  negative: '#B43C4A',
  backdrop: 'rgba(16, 29, 62, 0.64)',
  dialogBackdrop: 'rgba(7, 14, 30, 0.78)',
  error: '#A3322C',
  errorSoft: '#F9EDEA',
  olive: '#487024',
  copper: '#AA5E16',
  onPrimary: '#FFFFFF',
  onDanger: '#FFFFFF',
  dangerButton: '#A3322C',
  dangerPressed: '#8A2924',
  negativeSoft: '#F9E9ED',
  positiveSoft: '#E6F5EE',
  warning: '#815321',
  warningSoft: '#FFF0D9',
  placeholder: '#626F85',
  avatar: '#DCE3FF',
  handle: '#A5AEC0',
  shadow: '#15244A',
  brandPrimary: '#2348EF',
  brandPressed: '#1838CB',
  onBrand: '#FFFFFF',
  logoSurface: '#FFFFFF',
  chartMask: '#FFFFFF',
  cardShadow: '0px 6px 14px rgba(21,36,74,0.16)',
};

export const darkColors = {
  ...lightColors,
  background: '#101727',
  surface: '#1B2538',
  surfaceMuted: '#243149',
  text: '#F0F4FF',
  secondary: '#B1BED4',
  primary: '#9AB0FF',
  primaryPressed: '#8299EF',
  primarySoft: '#293858',
  border: '#3B4A64',
  positive: '#7BDCB4',
  positiveSoft: '#1C3D36',
  negative: '#FFABB9',
  negativeSoft: '#432B3B',
  backdrop: 'rgba(0, 0, 0, 0.68)',
  dialogBackdrop: 'rgba(0, 0, 0, 0.78)',
  error: '#FFB1A8',
  errorSoft: '#442D32',
  olive: '#B5D78B',
  copper: '#F2BA7D',
  warning: '#F2CB8C',
  warningSoft: '#443A2B',
  onPrimary: '#101727',
  placeholder: '#A1AFC8',
  avatar: '#2D3E67',
  handle: '#72839F',
  shadow: '#000000',
  cardShadow: '0px 6px 14px rgba(0,0,0,0.28)',
};

// Compatibilidade com dados e testes que precisam da paleta clara.
// A interface usa useTheme(), nunca este valor estático.
export const colors = lightColors;

export const fontFamily = Platform.OS === 'web' ? 'Vikash Sans, Arial, sans-serif' : 'VikashSans';
export const fontFamilyMedium = Platform.OS === 'web' ? fontFamily : 'VikashSansMedium';
export const fontFamilyBold = Platform.OS === 'web' ? fontFamily : 'VikashSansBold';
export const radii = { field: 14, button: 16, panel: 24, sheet: 30 };

export const createTypography = palette => ({
  title: { fontFamily: fontFamilyBold, fontSize: 30, fontWeight: '700', letterSpacing: -1.1, lineHeight: 39, color: palette.text },
  body: { fontFamily, fontSize: 16, lineHeight: 23, color: palette.secondary },
  label: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 20, fontWeight: '500', color: palette.secondary },
});
export const typography = createTypography(lightColors);
export const themes = {
  light: { scheme: 'light', colors: lightColors, typography: createTypography(lightColors) },
  dark: { scheme: 'dark', colors: darkColors, typography: createTypography(darkColors) },
};
