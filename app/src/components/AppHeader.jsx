import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BrandLogo from './BrandLogo';
import { colors, fontFamilyBold } from '../theme';

export default function AppHeader({ profile }) {
  const name = profile?.name?.trim() || '';
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.filter((_, index) => index === 0 || index === parts.length - 1)
    .map(part => part[0]).join('').toUpperCase() || 'V';

  return <View style={s.header}>
    <BrandLogo width={126} />
    <View accessible accessibilityLabel={name || 'Seu perfil'} style={s.avatar}>
      <Text style={s.initials}>{initials}</Text>
    </View>
  </View>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DCE3FF', alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamilyBold, fontSize: 15, fontWeight: '700', color: colors.text },
});
