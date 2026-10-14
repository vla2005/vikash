import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React, { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import logos from '../assets/institutions';

import Icon from './Icon';
import { API_BASE_URL } from '../config/api';
import { readableAccent } from '../theme/categoryPalette';

function InstitutionLogo({ institution, size = 34, fallbackIcon = 'bank', fallbackColor, backgroundColor }) {
  const { colors, scheme } = useTheme();
  const styles = useThemeStyles(createStyles);
  fallbackColor ??= colors.secondary;
  backgroundColor ??= colors.surface;
  const [failedKey, setFailedKey] = useState(null);
  const logoUrl = institution?.logoUrl || '';
  const assetKey = logoUrl.split('?')[0].split('/').pop()?.replace(/\.webp$/i, '');
  const remoteUri = /^https?:\/\//i.test(logoUrl) ? logoUrl : logoUrl.startsWith('/') ? `${API_BASE_URL}${logoUrl}` : null;
  const source = logos[assetKey] || (remoteUri ? { uri: remoteUri } : null);
  const key = `${institution?.id}:${logoUrl}`;
  const hasLogo = source && failedKey !== key;
  return <View style={[styles.frame, { width: size, height: size, borderRadius: Math.round(size / 4), backgroundColor: hasLogo ? colors.logoSurface : backgroundColor }]}>
    {hasLogo ? <Image source={source} onError={() => setFailedKey(key)} resizeMode="contain" accessible={false} style={[styles.image, { width: size - 6, height: size - 6 }]} /> : <Icon name={fallbackIcon} color={readableAccent(fallbackColor, scheme)} size={size * 0.6} />}
  </View>;
}

const createStyles = (colors) => StyleSheet.create({
  frame: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { borderRadius: 5 },
});

export default memo(InstitutionLogo);
