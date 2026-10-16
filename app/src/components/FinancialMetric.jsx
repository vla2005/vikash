import React, { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import useReducedMotion from '../hooks/useReducedMotion';
import { fontFamilyBold, fontFamilyMedium } from '../theme';
import Icon from './Icon';
import Skeleton from './Skeleton';

// Bento Pod animado para Entradas e Saídas (usado na Home e no Extrato).
export default function FinancialMetric({
  label,
  value,
  income = false,
  loading = false,
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const foreground = income ? colors.positive : colors.negative;
  const softBg = income ? colors.positiveSoft : colors.negativeSoft;
  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion || loading) {
      iconScale.set(1);
      return;
    }
    iconScale.set(0.84);
    iconScale.set(withSpring(1, { damping: 14, stiffness: 260 }));
  }, [iconScale, loading, reducedMotion, value]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.get() }],
  }));

  return (
    <View
      style={[
        styles.metric,
        width < 360 && styles.fullWidth,
        {
          backgroundColor: softBg,
          borderColor: `${foreground}38`,
        },
      ]}
    >
      <View style={styles.heading}>
        <Animated.View
          style={[
            styles.iconBadge,
            { backgroundColor: `${foreground}24` },
            badgeStyle,
          ]}
        >
          <Icon
            name={income ? 'trendUp' : 'trendDown'}
            size={16}
            color={foreground}
          />
        </Animated.View>
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
  metric: {
    flex: 1,
    minWidth: 0,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamilyBold,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 19,
  },
  value: {
    fontFamily: fontFamilyBold,
    fontWeight: '700',
    fontSize: 21,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  longValue: { fontSize: 16 },
});
