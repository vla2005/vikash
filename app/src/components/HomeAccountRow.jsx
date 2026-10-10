import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import InstitutionLogo from './InstitutionLogo';
import Icon from './Icon';
import useReducedMotion from '../hooks/useReducedMotion';
import { getAccountType } from '../constants/accountTypes';
import { getInstitutionCardColor } from '../constants/financialInstitutionColors';
import { hiddenAmount } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function HomeAccountRow({ account, hidden, onOpen }) {
  const type = getAccountType(account.type);
  const scale = useRef(new Animated.Value(1)).current;
  const animation = useRef(null);
  const reducedMotion = useReducedMotion();
  const accent = account.financialInstitution ? getInstitutionCardColor(account.financialInstitution) : type.color;

  useEffect(() => {
    animation.current?.stop();
    scale.setValue(1);
    return () => animation.current?.stop();
  }, [reducedMotion, scale]);

  function animatePress(pressed) {
    animation.current?.stop();
    if (reducedMotion) { return; }
    animation.current = Animated.timing(scale, {
      toValue: pressed ? 0.985 : 1,
      duration: pressed ? 90 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.current.start();
  }

  return <Animated.View style={{ transform: [{ scale }] }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir conta ${account.description}`}
      disabled={!onOpen} onPress={() => onOpen(account.uuid)}
      onPressIn={() => animatePress(true)} onPressOut={() => animatePress(false)}
      style={({ pressed }) => [s.row, pressed && s.pressed]}>
      <InstitutionLogo institution={account.financialInstitution} size={44} fallbackIcon={type.icon}
        fallbackColor={accent} backgroundColor={`${accent}12`} />
      <View style={s.copy}>
        <Text numberOfLines={2} style={s.name}>{account.description}</Text>
        <Text style={s.caption}>{type.label}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}
        style={[s.amount, !hidden && account.balance > 0 && s.positive, !hidden && account.balance < 0 && s.negative]}>
        {hidden ? hiddenAmount : formatCurrency(account.balance)}
      </Text>
      <Icon name="chevron" size={16} color={colors.secondary} />
    </Pressable>
  </Animated.View>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 88, paddingVertical: 16, borderRadius: 14 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: fontFamilyMedium, fontWeight: '600', fontSize: 15, lineHeight: 22, color: colors.text },
  caption: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  amount: { maxWidth: '40%', flexShrink: 1, textAlign: 'right', fontFamily: fontFamilyBold, fontWeight: '700',
    fontSize: 16, lineHeight: 24, fontVariant: ['tabular-nums'], color: colors.text },
  positive: { color: colors.positive }, negative: { color: colors.negative },
  pressed: { backgroundColor: colors.surfaceMuted },
});
