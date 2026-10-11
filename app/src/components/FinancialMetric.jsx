import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { fontFamilyBold, fontFamilyMedium } from '../theme';
import Icon from './Icon';
import Skeleton from './Skeleton';

// Entradas e saídas usam o mesmo tratamento no dashboard e no extrato.
export default function FinancialMetric({
  label,
  value,
  income = false,
  loading = false,
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const foreground = income ? colors.positive : colors.negative;
  return (
    <View
      style={[
        styles.metric,
        width < 360 && styles.fullWidth,
        { backgroundColor: income ? colors.positiveSoft : colors.negativeSoft },
      ]}
    >
      <View style={styles.heading}>
        <Icon
          name={income ? 'trendUp' : 'trendDown'}
          size={18}
          color={foreground}
        />
        <Text style={[styles.label, { color: foreground }]}>{label}</Text>
      </View>
      {loading ? (
        <Skeleton height={28} />
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[
            styles.value,
            ((width >= 360 && width < 390) || String(value).length > 14) &&
              styles.longValue,
            { color: foreground },
          ]}
        >
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { flexBasis: '100%' },
  metric: { flex: 1, minWidth: 0, padding: 12, borderRadius: 15, gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 20 },
  value: {
    fontFamily: fontFamilyBold,
    fontWeight: '700',
    fontSize: 21,
    lineHeight: 29,
    fontVariant: ['tabular-nums'],
  },
  longValue: { fontSize: 16 },
});
