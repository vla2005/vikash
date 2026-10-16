import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { FadeComponent } from '../shared/components/reacticx/base/fade-component';
import { useTheme } from '../contexts/ThemeContext';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';
import useReducedMotion from '../hooks/useReducedMotion';
import Icon from './Icon';
import Skeleton from './Skeleton';
import GlassPanel from './silver/GlassPanel';
import { PulseDot } from './motion/AnimatedPrimitives';

export default function BalanceCard({
  label = 'Saldo total',
  value,
  caption,
  loading = false,
}) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const valueScale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion || loading) {
      valueScale.set(1);
      return;
    }
    valueScale.set(0.96);
    valueScale.set(withSpring(1, { damping: 16, stiffness: 260 }));
  }, [loading, reducedMotion, value, valueScale]);

  const animatedValueStyle = useAnimatedStyle(() => ({
    transform: [{ scale: valueScale.get() }],
  }));

  return (
    <GlassPanel
      variant="hero"
      style={[styles.card, { backgroundColor: colors.balanceSurface }]}
    >
      <View pointerEvents="none" style={styles.ambientGlow} />

      <View style={styles.heading}>
        <View style={styles.badgePill}>
          <PulseDot color={colors.primary} size={7} />
          <Text style={[styles.label, { color: colors.onBalance }]}>
            {label}
          </Text>
        </View>
        <View style={styles.walletChip}>
          <Icon name="wallet" color={colors.primary} size={20} />
        </View>
      </View>

      <FadeComponent
        state={loading ? 'from' : 'to'}
        duration={180}
        fadeInSlideDistance={6}
        fadeOutSlideDistance={6}
        style={styles.valueContainer}
      >
        <FadeComponent.From>
          <Skeleton width="80%" height={46} />
        </FadeComponent.From>
        <FadeComponent.To>
          <Animated.View
            accessibilityElementsHidden={loading}
            importantForAccessibility={loading ? 'no-hide-descendants' : 'auto'}
            style={animatedValueStyle}
          >
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
          </Animated.View>
        </FadeComponent.To>
      </FadeComponent>

      {!!caption && (
        <View style={styles.footer}>
          <Text style={[styles.caption, { color: colors.balanceSecondary }]}>
            {caption}
          </Text>
        </View>
      )}
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingVertical: 20,
    gap: 12,
  },
  ambientGlow: {
    position: 'absolute',
    top: -36,
    right: -24,
    width: 150,
    height: 90,
    borderRadius: 75,
    backgroundColor: 'rgba(245, 158, 11, 0.11)',
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.26)',
  },
  walletChip: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamilyBold,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },
  valueContainer: { minHeight: 47, justifyContent: 'center' },
  value: {
    fontFamily: fontFamilyBold,
    fontWeight: '700',
    fontSize: 38,
    lineHeight: 47,
    letterSpacing: -1.1,
    fontVariant: ['tabular-nums'],
  },
  longValue: { fontSize: 27 },
  footer: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  caption: { fontFamily, fontSize: 13, lineHeight: 19 },
});
