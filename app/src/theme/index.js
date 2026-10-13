import { Platform } from 'react-native';

export const lightColors = {
  background: '#F3F5F9',
  surface: '#FFFFFF',
  dialogSurface: '#FFFFFF',
  text: '#15244A',
  secondary: '#606D83',
  primary: '#2348EF',
  primaryPressed: '#1838CB',
  primarySoft: '#E8EDFF',
  surfaceMuted: '#EDF1F7',
  border: '#DAE1ED',
  positive: '#08734F',
  negative: '#B42C49',
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
  negativeSoft: '#FFE9EE',
  positiveSoft: '#DCF6E9',
  warning: '#815321',
  warningSoft: '#FFF0D2',
  info: '#6843B9',
  infoSoft: '#EEE7FF',
  balanceSurface: '#2348D9',
  onBalance: '#FFFFFF',
  balanceSecondary: '#DBE4FF',
  placeholder: '#606D83',
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
  surface: '#1C2636',
  dialogSurface: '#1C2636',
  surfaceMuted: '#263244',
  text: '#F0F4FF',
  secondary: '#B1BED4',
  primary: '#96AEFF',
  primaryPressed: '#829BEF',
  primarySoft: '#273A66',
  border: '#3B4A60',
  positive: '#5DE3AB',
  positiveSoft: '#163E32',
  negative: '#FF91A6',
  negativeSoft: '#472936',
  backdrop: 'rgba(0, 0, 0, 0.68)',
  dialogBackdrop: 'rgba(0, 0, 0, 0.78)',
  error: '#FFB1A8',
  errorSoft: '#442D32',
  olive: '#B5D78B',
  copper: '#F2BA7D',
  warning: '#FFCE75',
  warningSoft: '#453722',
  info: '#C6A4FF',
  infoSoft: '#392C53',
  balanceSurface: '#3048D5',
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

const createTypography = palette => ({
  title: { fontFamily: fontFamilyBold, fontSize: 30, fontWeight: '700', letterSpacing: -1.1, lineHeight: 39, color: palette.text },
  body: { fontFamily, fontSize: 16, lineHeight: 23, color: palette.secondary },
  label: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 20, fontWeight: '500', color: palette.secondary },
});
export const themes = {
  light: { scheme: 'light', colors: lightColors, typography: createTypography(lightColors) },
  dark: { scheme: 'dark', colors: darkColors, typography: createTypography(darkColors) },
};
