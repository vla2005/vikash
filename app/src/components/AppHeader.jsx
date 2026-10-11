import { useThemeStyles } from '../contexts/ThemeContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BrandLogo from './BrandLogo';
import { fontFamilyBold } from '../theme';
import { getProfileInitials } from '../utils/profile';

export default function AppHeader({ profile, onOpenProfile }) {
  const s = useThemeStyles(createStyles);
  const name = profile?.name?.trim() || '';
  const initials = getProfileInitials(name);

  return <View style={s.header}>
    <BrandLogo width={126} />
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir perfis" accessibilityHint={`${name}. Alternar contas ou acessar meu perfil.`}
      onPress={onOpenProfile} disabled={!onOpenProfile} hitSlop={6} style={({ pressed }) => [s.avatar, pressed && s.pressed]}>
      <Text style={s.initials}>{initials}</Text>
    </Pressable>
  </View>;
}

const createStyles = (colors) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamilyBold, fontSize: 15, fontWeight: '700', color: colors.text },
  pressed: { opacity: 0.75 },
});
