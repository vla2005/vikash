import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import logos from '../assets/institutions';
import { colors } from '../theme';
import Icon from './Icon';
import { API_BASE_URL } from '../config/api';

export default function InstitutionLogo({ institution, size = 34, fallbackIcon = 'bank', fallbackColor = colors.secondary, backgroundColor = colors.surface }) {
  const [failedKey, setFailedKey] = useState(null);
  const logoUrl = institution?.logoUrl || '';
  const assetKey = logoUrl.split('?')[0].split('/').pop()?.replace(/\.webp$/i, '');
  const remoteUri = /^https?:\/\//i.test(logoUrl) ? logoUrl : logoUrl.startsWith('/') ? `${API_BASE_URL}${logoUrl}` : null;
  const source = logos[assetKey] || (remoteUri ? { uri: remoteUri } : null);
  const key = `${institution?.id}:${logoUrl}`;
  return <View style={[styles.frame, { width: size, height: size, borderRadius: Math.round(size / 4), backgroundColor }]}>
    {source && failedKey !== key ? <Image source={source} onError={() => setFailedKey(key)} resizeMode="contain" accessible={false} style={[styles.image, { width: size - 6, height: size - 6 }]} /> : <Icon name={fallbackIcon} color={fallbackColor} size={size * 0.6} />}
  </View>;
}

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { borderRadius: 5 },
});
