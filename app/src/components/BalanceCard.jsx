import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';
import Icon from './Icon';
import Skeleton from './Skeleton';
import GlassPanel from './silver/GlassPanel';

export default function BalanceCard({
  label = 'Saldo total',
  value,
  caption,
  loading = false,
}) {
  const { colors } = useTheme();
  return (
    <GlassPanel style={[styles.card, { backgroundColor: colors.balanceSurface }]}>
      <View style={styles.heading}>
        <Text style={[styles.label, { color: colors.onBalance }]}>{label}</Text>
        <Icon name="wallet" color={colors.balanceSecondary} size={23} />
      </View>
      {loading ? (
        <Skeleton width="80%" height={46} />
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          style={[
            styles.value,
            String(value).length > 16 && styles.longValue,
            { color: colors.onBalance },
          ]}
        >
          {value}
        </Text>
      )}
      {!!caption && (
        <Text style={[styles.caption, { color: colors.balanceSecondary }]}>
          {caption}
        </Text>
      )}
    </GlassPanel>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 20, gap: 8 },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 22 },
  value: {
    fontFamily: fontFamilyBold,
    fontWeight: '700',
    fontSize: 36,
    lineHeight: 47,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  longValue: { fontSize: 27 },
  caption: { fontFamily, fontSize: 13, lineHeight: 20 },
});
