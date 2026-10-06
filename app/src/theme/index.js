import { Platform } from 'react-native';

export const colors = {
  background: '#F4F7FC',
  surface: '#FFFFFF',
  text: '#15244A',
  secondary: '#66738B',
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
};

export const fontFamily = Platform.OS === 'web' ? 'Vikash Sans, Arial, sans-serif' : 'VikashSans';
export const fontFamilyMedium = Platform.OS === 'web' ? fontFamily : 'VikashSansMedium';
export const fontFamilyBold = Platform.OS === 'web' ? fontFamily : 'VikashSansBold';
export const radii = { field: 14, button: 16, panel: 24, sheet: 30 };

export const typography = {
  title: { fontFamily: fontFamilyBold, fontSize: 30, fontWeight: '700', letterSpacing: -1.1, lineHeight: 39, color: colors.text },
  body: { fontFamily, fontSize: 16, lineHeight: 23, color: colors.secondary },
  label: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 20, fontWeight: '500', color: colors.secondary },
};
