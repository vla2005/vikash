import { Platform } from 'react-native';

export const colors = {
  background: '#F5F3ED',
  surface: '#FFFFFF',
  text: '#252824',
  secondary: '#717175',
  primary: '#244DE8',
  primaryPressed: '#183CBD',
  primarySoft: '#E8EDFC',
  border: '#DFDFE2',
  error: '#A3322C',
  errorSoft: '#F9EDEA',
  olive: '#487024',
  copper: '#AA5E16',
};

export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'Arial',
});

export const typography = {
  title: { fontFamily, fontSize: 30, fontWeight: '700', letterSpacing: -1.1, lineHeight: 36 },
  body: { fontFamily, fontSize: 16, lineHeight: 23, color: colors.secondary },
  label: { fontFamily, fontSize: 14, lineHeight: 20, fontWeight: '500', color: colors.secondary },
};
